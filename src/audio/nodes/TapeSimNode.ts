/**
 * TapeSimNode - Analog tape simulation with wow/flutter, head bump, HF rolloff, and odd harmonic saturation
 *
 * Signal chain: Input → HeadBump → HFRolloff → WowFlutter → PreSatGain → OddHarmonicSaturation → PostSatGain → Output
 *
 * Calibration: Reference level is -18 dBFS (0 VU)
 * - Pre-saturation gain boosts signal so -18 dBFS hits the harmonic generation threshold
 * - Post-saturation gain compensates to restore original level
 */

// Reference level calibration: -18 dBFS = 0 VU
// We want -18 dBFS (0.126 linear) to map to ~0.5 on the WaveShaper curve
// Gain = 0.5 / 0.126 ≈ 4.0 (+12dB)
const PRE_SAT_GAIN = 4.0;
const POST_SAT_GAIN = 1.0 / PRE_SAT_GAIN; // Compensate

export class TapeSimNode {
  private inputGain: GainNode; // Common entry point
  private headBumpFilter: BiquadFilterNode;
  private hfRolloffFilter: BiquadFilterNode;
  private wobbleWorklet: AudioWorkletNode | null = null;
  private preSatGain: GainNode;
  private oddHarmonicSaturator: WaveShaperNode;
  private postSatGain: GainNode;
  private outputGain: GainNode;
  private bypassGain: GainNode;
  private ctx: AudioContext;
  private isBypassed: boolean = false; // Active by default
  private isInitialized: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Common input gain node (entry point for all routing)
    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = 1.0;

    // Head bump filter: subtle low-frequency boost (tape head resonance)
    this.headBumpFilter = ctx.createBiquadFilter();
    this.headBumpFilter.type = "peaking";
    this.headBumpFilter.frequency.value = 80; // Hz
    this.headBumpFilter.Q.value = 0.7;
    this.headBumpFilter.gain.value = 2; // +2dB subtle warmth

    // HF rolloff filter: gentle high-frequency smoothing
    this.hfRolloffFilter = ctx.createBiquadFilter();
    this.hfRolloffFilter.type = "lowpass";
    this.hfRolloffFilter.frequency.value = 15000; // Hz - subtle rolloff
    this.hfRolloffFilter.Q.value = 0.5;

    // Pre-saturation gain: boost signal so -18 dBFS hits the saturation knee
    this.preSatGain = ctx.createGain();
    this.preSatGain.gain.value = PRE_SAT_GAIN;

    // Odd harmonic saturation: adds 3rd harmonic (tape character) at 100% intensity
    // Formula: output = input + harmonics (3rd, 5th, 7th with 1/n³ decay)
    this.oddHarmonicSaturator = ctx.createWaveShaper();
    this.oddHarmonicSaturator.curve =
      this.createOddHarmonicCurve() as Float32Array<ArrayBuffer>;
    this.oddHarmonicSaturator.oversample = "4x"; // Reduce aliasing

    // Post-saturation gain: compensate for the pre-saturation boost
    this.postSatGain = ctx.createGain();
    this.postSatGain.gain.value = POST_SAT_GAIN;

    // Output gain (stereo processing handled in worklet)
    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 1.0;

    // Bypass gain (common output for bypass routing)
    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 1.0;

    // Connect processing chain (will be completed after worklet initialization)
    this.headBumpFilter.connect(this.hfRolloffFilter);

    // Initial routing: bypass (input → bypass)
    this.inputGain.connect(this.bypassGain);
  }

  /**
   * Initialize the AudioWorklet node
   * Must be called after AudioEngine has loaded the worklet
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.wobbleWorklet = new AudioWorkletNode(this.ctx, "tape-wobble");

      // Complete the signal chain
      // HeadBump → HFRolloff → WowFlutter → PreSatGain → OddHarmonicSaturation → PostSatGain → Output
      this.hfRolloffFilter.connect(this.wobbleWorklet);
      this.wobbleWorklet.connect(this.preSatGain);
      this.preSatGain.connect(this.oddHarmonicSaturator);
      this.oddHarmonicSaturator.connect(this.postSatGain);
      this.postSatGain.connect(this.outputGain);
      // Connect output to bypassGain (common output node)
      this.outputGain.connect(this.bypassGain);

      this.isInitialized = true;
      // Set initial routing based on bypass state
      this.updateRouting();
      console.log("TapeSimNode initialized successfully with wow/flutter");
    } catch (error) {
      console.error("Failed to create TapeWobble AudioWorkletNode:", error);
      // Fallback: connect filters + saturation directly (no wow/flutter)
      this.hfRolloffFilter.connect(this.preSatGain);
      this.preSatGain.connect(this.oddHarmonicSaturator);
      this.oddHarmonicSaturator.connect(this.postSatGain);
      this.postSatGain.connect(this.outputGain);
      // Connect output to bypassGain (common output node)
      this.outputGain.connect(this.bypassGain);

      this.isInitialized = true;
      // Set initial routing based on bypass state
      this.updateRouting();
      console.log("TapeSimNode initialized with fallback (filters only)");
    }
  }

  /**
   * Update internal routing based on bypass state
   */
  private updateRouting(): void {
    // Disconnect input from everything
    this.inputGain.disconnect();

    if (this.isBypassed || !this.isInitialized) {
      // Bypass: connect input directly to bypassGain (skip all processing)
      this.inputGain.connect(this.bypassGain);
    } else {
      // Process: connect input to processing chain
      this.inputGain.connect(this.headBumpFilter);
    }
  }

  /**
   * Get input node for connection
   * @returns GainNode (inputGain) as common entry point
   */
  getInput(): AudioNode {
    return this.inputGain;
  }

  /**
   * Set bypass state
   * @param bypassed - True to bypass tape simulation, false to enable
   */
  setBypass(bypassed: boolean): void {
    this.isBypassed = bypassed;
    this.updateRouting();
  }

  /**
   * Get bypass state
   * @returns True if bypassed, false if processing
   */
  getBypass(): boolean {
    return this.isBypassed;
  }

  /**
   * Connect to destination
   * @param destination - AudioNode to connect output to
   */
  connect(destination: AudioNode): void {
    // Always connect bypassGain (common output) to destination
    this.bypassGain.connect(destination);
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    // Only disconnect output (bypassGain), preserve internal routing
    this.bypassGain.disconnect();
  }

  /**
   * Create WaveShaper curve that adds odd harmonics with 1/n³ decay
   * Odd harmonics (3rd, 5th, 7th) create symmetric "tape" distortion
   * Always applied at 100% intensity (no user control)
   */
  private createOddHarmonicCurve(): Float32Array {
    // WaveShaper curve resolution: 2^16 + 1 = 65537
    // Odd count ensures a center sample at x=0 for proper symmetry
    const samples = 65537;
    const curve = new Float32Array(samples);

    const baseCoeff = 1.0; // Base coefficient
    const harmonics = [3, 5, 7]; // Odd harmonic orders

    for (let i = 0; i < samples; i++) {
      // Map index to -1.0 to +1.0 range (standard Web Audio input range)
      const x = (i / (samples - 1)) * 2 - 1;

      let y = x; // Start with fundamental

      // Add odd harmonics with 1/n³ decay
      for (const n of harmonics) {
        const coeff = baseCoeff / (n * n * n); // 1/n³ decay
        // Odd harmonics: symmetric, use x^n
        y += coeff * Math.pow(x, n);
      }

      // Soft limit using tanh to prevent harsh clipping
      curve[i] = Math.tanh(y);
    }

    return curve;
  }
}
