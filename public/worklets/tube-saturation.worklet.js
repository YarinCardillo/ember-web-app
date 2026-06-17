/**
 * TubeSaturationProcessor - Multiband tube saturation, physically modelled.
 *
 * Topology (per channel):
 *   1. 4x oversampling (polyphase FIR up/down) so the nonlinearity does not
 *      alias back into the audio band.
 *   2. Linkwitz-Riley 4th-order split into 3 bands (200 Hz / 2 kHz).
 *   3. Each band drives its own Koren triode stage. The static curve is baked
 *      into a lookup table solved along the plate load line (not a fixed plate
 *      voltage): low -> 12AU7 (low mu, tight, clean), mid -> 12AT7,
 *      high -> 12AX7 (hot).
 *   4. Dynamic physics layered on the static curve: self-bias drift (cathode
 *      cap), grid blocking, power-supply sag, and a Miller/coupling HF rolloff.
 *   5. Bands summed, decimated, DC-blocked (triode asymmetry adds DC).
 *
 * No parameters: the only lever is the level fed in (the IN gain), exactly like
 * pushing a real amp harder. Calibration: -18 dBFS == 0 VU sits at the knee.
 */

// -18 dBFS (0 VU) in linear amplitude: 10^(-18/20).
const REFERENCE_LINEAR = 0.12589254117941673;

const OS = 8; // oversampling factor
const FIR_LEN = 64; // resampling prototype length (multiple of OS)
const FIR_TAPS = FIR_LEN / OS; // taps per polyphase branch
const FIR_FC = 0.115; // lowpass cutoff as a fraction of the oversampled rate

const F_LOW = 200; // low/mid crossover (Hz)
const F_HIGH = 2000; // mid/high crossover (Hz)

const LUT_SIZE = 8192;
const LUT_XMAX = 18.0; // table spans grid drive u in [-XMAX, XMAX]; u = 1 -> 0 VU.
// Wide enough that even a full-scale input (u ~= 8) saturates on the tube's own
// curve instead of hard-clipping at the table edge. LUT_SIZE scaled up to keep
// the knee (where normal signal lives) at the original resolution.
const GRID_CLAMP = -0.2; // approximate grid-conduction limit (V)
const GRID_KNEE = 0.03; // V, soft-knee width at grid-conduction onset. A hard clamp
// here put a corner in the transfer curve right in the normal signal range (u~1 for
// the 12AT7/12AX7), which rasped when driven through. The knee rounds it off while
// preserving the Koren shape.
const VSUPPLY = 300; // plate supply B+ (V), shared across types

// Dynamic (stateful) physics layered on the static curve. All subtle; tune here.
const DYN_BIAS_DEPTH = 0.00; // self-bias drift (cathode cap), per unit level
const DYN_BIAS_TAU = 0.035; // s, slow follower for the bias drift
const BLOCK_THRESH = 20.0; // grid-conduction onset, in u (0 VU = 1)
const BLOCK_DEPTH = 0.15; // how hard the grid blocks (bias push toward cutoff)
const BLOCK_ATK = 0.001; // s, blocking onset (finite; avoids a bias-step click)
const BLOCK_TAU = 0.045; // s, blocking recovery
const SAG_DEPTH = 0.12; // max supply sag (fractional gain/headroom loss)
const SAG_ATK = 0.008; // s, sag onset
const SAG_REL = 0.07; // s, sag recovery
const MILLER_FC = 17000; // Hz, Miller/coupling HF rolloff on the high (12AX7) band
// The nonlinearity regenerates HF harmonics inside each band, above what the
// input-side crossover removed. The low/mid bands need their own rolloff too, or
// the bass band's saturation fizz reads as a raspy "grattone" when driven hard.
const LOW_ROLLOFF_FC = 4000; // Hz, HF rolloff on the low (12AU7) band
const MID_ROLLOFF_FC = 8000; // Hz, HF rolloff on the mid (12AT7) band

// Norman Koren triode parameters per type, plus a class-A bias point, the grid
// swing that maps 0 VU to a gentle breakup, and the plate load for the load
// line. low mu -> cleaner, tighter.
// Tuned (against the load line) so the three bands match level at 0 VU and
// graduate cleanly: low saturates least, high earliest.
const TUBES = {
    "12AU7": { MU: 17, EX: 1.3, KG1: 420, KP: 300, KVB: 300, bias: -4.5, vdrive: 0.15, RLOAD: 22000 },
    "12AT7": { MU: 60, EX: 1.35, KG1: 460, KP: 300, KVB: 300, bias: -2.5, vdrive: 1.8, RLOAD: 47000 },
    "12AX7": { MU: 100, EX: 1.4, KG1: 1060, KP: 600, KVB: 300, bias: -1.5, vdrive: 1.3, RLOAD: 100000 },
};

/**
 * Build a normalized grid-to-output transfer table from the Koren model.
 * Small-signal gain is normalized to ~unity so bands stay level-matched; the
 * curve saturates asymmetrically (cutoff one side, grid clamp the other).
 */
function buildTubeLut(name) {
    const p = TUBES[name];

    // Koren plate current at plate voltage vp and grid voltage vg.
    const plateCurrent = (vp, vg) => {
        // Soft grid-conduction knee: grid voltage saturates smoothly toward
        // GRID_CLAMP instead of a hard corner. softplus, guarded against overflow.
        const gz = (GRID_CLAMP - vg) / GRID_KNEE;
        const grid = GRID_CLAMP - GRID_KNEE * (gz > 30 ? gz : Math.log1p(Math.exp(gz)));
        const denom = Math.sqrt(p.KVB + vp * vp);
        const z = p.KP * (1 / p.MU + grid / denom);
        // softplus, guarded against exp() overflow for large z
        const softplus = z > 30 ? z : Math.log1p(Math.exp(z));
        const e1 = (vp / p.KP) * softplus;
        return Math.pow(e1 > 0 ? e1 : 0, p.EX) / p.KG1;
    };

    // Load line: the plate settles where the tube's current and the plate
    // resistor agree, vp = VSUPPLY - ip*RLOAD. Damped fixed point (it is negative
    // feedback, so it converges).
    const solveVp = (vg) => {
        let vp = VSUPPLY * 0.6;
        for (let k = 0; k < 60; k++) {
            const target = VSUPPLY - plateCurrent(vp, vg) * p.RLOAD;
            vp = vp * 0.5 + target * 0.5;
            if (vp < 1) vp = 1;
            else if (vp > VSUPPLY) vp = VSUPPLY;
        }
        return vp;
    };

    const vp0 = solveVp(p.bias);
    const transfer = (u) => -(solveVp(p.bias + u * p.vdrive) - vp0);

    const eps = 1e-3;
    const slope = (transfer(eps) - transfer(-eps)) / (2 * eps);

    const lut = new Float32Array(LUT_SIZE);
    for (let i = 0; i < LUT_SIZE; i++) {
        const u = -LUT_XMAX + (2 * LUT_XMAX * i) / (LUT_SIZE - 1);
        lut[i] = transfer(u) / slope;
    }
    return lut;
}

/** Sample a transfer table at normalized drive x (x = 1 -> 0 VU). */
function shape(lut, x) {
    let t = ((x + LUT_XMAX) / (2 * LUT_XMAX)) * (LUT_SIZE - 1);
    if (t <= 0) return lut[0];
    if (t >= LUT_SIZE - 1) return lut[LUT_SIZE - 1];
    const i = t | 0;
    const f = t - i;
    return lut[i] * (1 - f) + lut[i + 1] * f;
}

/** RBJ biquad coefficients (Butterworth Q) for one channel of state. */
function makeBiquad(type, fs, fc) {
    const w0 = (2 * Math.PI * fc) / fs;
    const cos0 = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
    let b0, b1, b2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos0;
    const a2 = 1 - alpha;
    if (type === "lp") {
        b0 = (1 - cos0) / 2;
        b1 = 1 - cos0;
        b2 = (1 - cos0) / 2;
    } else {
        b0 = (1 + cos0) / 2;
        b1 = -(1 + cos0);
        b2 = (1 + cos0) / 2;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Linkwitz-Riley 4th order = two cascaded Butterworth biquads. */
class LR4 {
    constructor(coeffs) {
        this.c = coeffs;
        this.s = [
            { x1: 0, x2: 0, y1: 0, y2: 0 },
            { x1: 0, x2: 0, y1: 0, y2: 0 },
        ];
    }
    process(x) {
        const c = this.c;
        for (let n = 0; n < 2; n++) {
            const s = this.s[n];
            const y = c.b0 * x + c.b1 * s.x1 + c.b2 * s.x2 - c.a1 * s.y1 - c.a2 * s.y2;
            s.x2 = s.x1;
            s.x1 = x;
            s.y2 = s.y1;
            s.y1 = y;
            x = y;
        }
        return x;
    }
}

/** Polyphase 4x upsampler from a normalized lowpass prototype. */
class Upsampler {
    constructor(proto) {
        this.phases = [];
        for (let p = 0; p < OS; p++) {
            const branch = new Float32Array(FIR_TAPS);
            for (let k = 0; k < FIR_TAPS; k++) branch[k] = proto[k * OS + p] * OS;
            this.phases.push(branch);
        }
        this.hist = new Float32Array(FIR_TAPS);
        this.pos = 0;
    }
    /** Push one input sample, write OS oversampled samples into out at offset. */
    process(x, out, offset) {
        this.hist[this.pos] = x;
        for (let p = 0; p < OS; p++) {
            const branch = this.phases[p];
            let acc = 0;
            let idx = this.pos;
            for (let k = 0; k < FIR_TAPS; k++) {
                acc += branch[k] * this.hist[idx];
                idx = idx === 0 ? FIR_TAPS - 1 : idx - 1;
            }
            out[offset + p] = acc;
        }
        this.pos = this.pos === FIR_TAPS - 1 ? 0 : this.pos + 1;
    }
}

/** FIR + decimate by 4. */
class Downsampler {
    constructor(proto) {
        this.h = proto;
        this.hist = new Float32Array(FIR_LEN);
        this.pos = 0;
        this.phase = 0;
    }
    /** Push one oversampled sample; returns a number when a decimated output is
     * ready, otherwise null. */
    process(x) {
        this.hist[this.pos] = x;
        this.pos = this.pos === FIR_LEN - 1 ? 0 : this.pos + 1;
        if (++this.phase < OS) return null;
        this.phase = 0;
        let acc = 0;
        let idx = this.pos === 0 ? FIR_LEN - 1 : this.pos - 1;
        for (let k = 0; k < FIR_LEN; k++) {
            acc += this.h[k] * this.hist[idx];
            idx = idx === 0 ? FIR_LEN - 1 : idx - 1;
        }
        return acc;
    }
}

/** Hann-windowed sinc lowpass, normalized to unity DC gain. */
function designLowpass(len, fc) {
    const h = new Float32Array(len);
    const c = (len - 1) / 2;
    let sum = 0;
    for (let n = 0; n < len; n++) {
        const m = n - c;
        const sinc = m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m);
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (len - 1));
        h[n] = sinc * w;
        sum += h[n];
    }
    for (let n = 0; n < len; n++) h[n] /= sum;
    return h;
}

class TubeSaturationProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        this.lutLow = buildTubeLut("12AU7");
        this.lutMid = buildTubeLut("12AT7");
        this.lutHigh = buildTubeLut("12AX7");

        this.proto = designLowpass(FIR_LEN, FIR_FC);

        const fsOs = sampleRate * OS;
        this.lpLow = makeBiquad("lp", fsOs, F_LOW);
        this.hpLow = makeBiquad("hp", fsOs, F_LOW);
        this.lpHigh = makeBiquad("lp", fsOs, F_HIGH);
        this.hpHigh = makeBiquad("hp", fsOs, F_HIGH);

        // Per-sample coefficients for the dynamic stages (at the oversampled rate).
        this.dynA = 1 - Math.exp(-1 / (DYN_BIAS_TAU * fsOs));
        this.blockAtk = 1 - Math.exp(-1 / (BLOCK_ATK * fsOs));
        this.blockRel = 1 - Math.exp(-1 / (BLOCK_TAU * fsOs));
        this.sagAtk = 1 - Math.exp(-1 / (SAG_ATK * fsOs));
        this.sagRel = 1 - Math.exp(-1 / (SAG_REL * fsOs));
        this.millerA = 1 - Math.exp((-2 * Math.PI * MILLER_FC) / fsOs);
        this.lowMillerA = 1 - Math.exp((-2 * Math.PI * LOW_ROLLOFF_FC) / fsOs);
        this.midMillerA = 1 - Math.exp((-2 * Math.PI * MID_ROLLOFF_FC) / fsOs);

        this.channels = [];
    }

    /** Lazily build per-channel processing state once the channel count is known. */
    _channel(index) {
        let ch = this.channels[index];
        if (ch) return ch;
        ch = {
            up: new Upsampler(this.proto),
            down: new Downsampler(this.proto),
            lpLow: new LR4(this.lpLow),
            hpLow: new LR4(this.hpLow),
            lpHigh: new LR4(this.lpHigh),
            hpHigh: new LR4(this.hpHigh),
            b0: { dyn: 0, block: 0, miller: 0 },
            b1: { dyn: 0, block: 0, miller: 0 },
            b2: { dyn: 0, block: 0, miller: 0 },
            sagEnv: 0,
            dcX1: 0,
            dcY1: 0,
            osBuf: new Float32Array(128 * OS),
        };
        this.channels[index] = ch;
        return ch;
    }

    /**
     * One band: the static Koren curve plus the dynamic physics, self-bias drift
     * (cathode cap), grid blocking, supply sag and the Miller/coupling HF rolloff.
     */
    _band(st, lut, s, sagScale, millerCoeff) {
        const x = s / REFERENCE_LINEAR;
        const ax = x < 0 ? -x : x;
        // self-bias drift: slow follower pulls the operating point with level
        st.dyn += this.dynA * (ax - st.dyn);
        // grid blocking: a smoothed envelope with a fast (finite) attack and
        // slow recovery. The finite attack avoids stepping the operating-point
        // bias, which injected a click on transient onsets (worst on low band).
        const over = ax > BLOCK_THRESH ? ax - BLOCK_THRESH : 0;
        st.block +=
            (over > st.block ? this.blockAtk : this.blockRel) * (over - st.block);
        const biasShift = -(DYN_BIAS_DEPTH * st.dyn + BLOCK_DEPTH * st.block);
        const y = shape(lut, x + biasShift) * REFERENCE_LINEAR * sagScale;
        if (!millerCoeff) return y;
        // Per-stage HF rolloff (Miller + coupling caps), one pole per band. Applied
        // to every band: the nonlinearity regenerates HF above the crossover, so each
        // stage must be band-limited like a real tube stage or the low band fizzes.
        st.miller += millerCoeff * (y - st.miller);
        return st.miller;
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !input.length) return true;

        const invRef = 1 / REFERENCE_LINEAR;

        for (let c = 0; c < input.length; c++) {
            const inCh = input[c];
            const outCh = output[c];
            const frames = inCh.length;
            const ch = this._channel(c);
            const os = ch.osBuf;

            // Upsample, then split + saturate + sum at the oversampled rate.
            for (let i = 0; i < frames; i++) {
                ch.up.process(inCh[i], os, i * OS);
            }
            const osCount = frames * OS;
            for (let j = 0; j < osCount; j++) {
                const s = os[j];
                // Power-supply sag follows overall demand and shrinks every band's curve.
                const aS = s < 0 ? -s : s;
                ch.sagEnv +=
                    (aS > ch.sagEnv ? this.sagAtk : this.sagRel) * (aS - ch.sagEnv);
                const sagScale = 1 - SAG_DEPTH * Math.min(1, ch.sagEnv * invRef);

                const low = ch.lpLow.process(s);
                const rem = ch.hpLow.process(s);
                const mid = ch.lpHigh.process(rem);
                const high = ch.hpHigh.process(rem);
                os[j] =
                    this._band(ch.b0, this.lutLow, low, sagScale, this.lowMillerA) +
                    this._band(ch.b1, this.lutMid, mid, sagScale, this.midMillerA) +
                    this._band(ch.b2, this.lutHigh, high, sagScale, this.millerA);
            }

            // Decimate back to base rate, then block DC from the triode asymmetry.
            let outIdx = 0;
            for (let j = 0; j < osCount; j++) {
                const d = ch.down.process(os[j]);
                if (d === null) continue;
                const y = d - ch.dcX1 + 0.9985 * ch.dcY1;
                ch.dcX1 = d;
                ch.dcY1 = y;
                outCh[outIdx++] = y;
            }
        }

        return true;
    }
}

registerProcessor("tube-saturation", TubeSaturationProcessor);
