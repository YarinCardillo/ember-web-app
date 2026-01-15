/**
 * LUFS Short-Term Meter implementation
 * ITU-R BS.1770-4 compliant short-term loudness measurement
 * Short-term integration window: 3 seconds
 */

const INTEGRATION_TIME = 3.0; // seconds
const ABSOLUTE_GATE_THRESHOLD = -70; // LUFS

/**
 * Biquad filter state for K-weighting
 */
interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * Biquad filter coefficients
 */
interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * K-weighting filter state for a single channel
 */
interface KWeightingState {
  // Stage 1: High-shelf filter
  highShelf: BiquadState;
  // Stage 2: High-pass filter
  highPass: BiquadState;
}

export interface LufsState {
  // Ring buffer for 3-second window (interleaved stereo: L, R, L, R...)
  bufferL: Float32Array;
  bufferR: Float32Array;
  writeIndex: number;
  sampleRate: number;
  // K-weighting filter states
  kWeightL: KWeightingState;
  kWeightR: KWeightingState;
  // Filter coefficients (computed once per sample rate)
  highShelfCoefs: BiquadCoefficients;
  highPassCoefs: BiquadCoefficients;
  // Smoothed output
  smoothedLufs: number;
}

/**
 * Create initial biquad state
 */
function createBiquadState(): BiquadState {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

/**
 * Create K-weighting filter state
 */
function createKWeightingState(): KWeightingState {
  return {
    highShelf: createBiquadState(),
    highPass: createBiquadState(),
  };
}

/**
 * Calculate high-shelf filter coefficients for K-weighting Stage 1
 * ITU-R BS.1770-4: fc=1500Hz, G=+4dB, Q=0.707 (Butterworth)
 */
function calculateHighShelfCoefficients(
  sampleRate: number,
): BiquadCoefficients {
  const fc = 1500.0;
  const G = 4.0; // dB
  const Q = 1 / Math.sqrt(2); // Butterworth

  const K = Math.tan((Math.PI * fc) / sampleRate);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.5);
  const K2 = K * K;

  const a0 = 1 + K / Q + K2;
  const b0 = (Vh + Vb * (K / Q) + K2) / a0;
  const b1 = (2 * (K2 - Vh)) / a0;
  const b2 = (Vh - Vb * (K / Q) + K2) / a0;
  const a1 = (2 * (K2 - 1)) / a0;
  const a2 = (1 - K / Q + K2) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Calculate high-pass filter coefficients for K-weighting Stage 2
 * ITU-R BS.1770-4: fc=38Hz, Q=0.5
 */
function calculateHighPassCoefficients(sampleRate: number): BiquadCoefficients {
  const fc = 38.0;
  const Q = 0.5;

  const K = Math.tan((Math.PI * fc) / sampleRate);
  const K2 = K * K;

  const a0 = 1 + K / Q + K2;
  const b0 = 1 / a0;
  const b1 = -2 / a0;
  const b2 = 1 / a0;
  const a1 = (2 * (K2 - 1)) / a0;
  const a2 = (1 - K / Q + K2) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Create a new LUFS meter state
 */
export function createLufsState(sampleRate: number): LufsState {
  const bufferSize = Math.ceil(sampleRate * INTEGRATION_TIME);
  return {
    bufferL: new Float32Array(bufferSize),
    bufferR: new Float32Array(bufferSize),
    writeIndex: 0,
    sampleRate,
    kWeightL: createKWeightingState(),
    kWeightR: createKWeightingState(),
    highShelfCoefs: calculateHighShelfCoefficients(sampleRate),
    highPassCoefs: calculateHighPassCoefficients(sampleRate),
    smoothedLufs: -Infinity,
  };
}

/**
 * Process a single sample through a biquad filter
 */
function processBiquad(
  input: number,
  state: BiquadState,
  coefs: BiquadCoefficients,
): number {
  const output =
    coefs.b0 * input +
    coefs.b1 * state.x1 +
    coefs.b2 * state.x2 -
    coefs.a1 * state.y1 -
    coefs.a2 * state.y2;

  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = output;

  return output;
}

/**
 * Apply K-weighting to a single sample
 */
function applyKWeightingSample(
  input: number,
  kState: KWeightingState,
  highShelfCoefs: BiquadCoefficients,
  highPassCoefs: BiquadCoefficients,
): number {
  // Stage 1: High-shelf filter
  const stage1 = processBiquad(input, kState.highShelf, highShelfCoefs);
  // Stage 2: High-pass filter
  const stage2 = processBiquad(stage1, kState.highPass, highPassCoefs);
  return stage2;
}

/**
 * Calculate mean square value of a buffer
 */
function calculateMeanSquare(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return sum / buffer.length;
}

/**
 * Calculate LUFS from analyser node
 * Returns short-term loudness in LUFS (3-second window)
 *
 * Note: This implementation assumes a stereo AnalyserNode or mono input.
 * For proper stereo, the audio graph should split channels before analysis.
 */
export function calculateShortTermLufs(
  analyser: AnalyserNode,
  state: LufsState,
): number {
  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(dataArray);

  // Process samples through K-weighting and store in ring buffer
  // Note: AnalyserNode provides summed/mono data, so we treat L=R for now
  for (let i = 0; i < dataArray.length; i++) {
    const sample = dataArray[i];

    // Apply K-weighting to each channel
    const kWeightedL = applyKWeightingSample(
      sample,
      state.kWeightL,
      state.highShelfCoefs,
      state.highPassCoefs,
    );
    const kWeightedR = applyKWeightingSample(
      sample,
      state.kWeightR,
      state.highShelfCoefs,
      state.highPassCoefs,
    );

    // Store in ring buffer
    state.bufferL[state.writeIndex] = kWeightedL;
    state.bufferR[state.writeIndex] = kWeightedR;
    state.writeIndex = (state.writeIndex + 1) % state.bufferL.length;
  }

  // Calculate mean square for each channel
  const msL = calculateMeanSquare(state.bufferL);
  const msR = calculateMeanSquare(state.bufferR);

  // Sum channels with weights (ITU-R BS.1770-4)
  // L=1.0, R=1.0, C=1.0, Ls=1.41, Rs=1.41
  // For stereo: just L + R
  const summedMeanSquare = msL + msR;

  // Convert to LUFS
  // LUFS = -0.691 + 10 * log10(sum of weighted mean squares)
  if (summedMeanSquare <= 0) {
    return -Infinity;
  }

  const lufs = -0.691 + 10 * Math.log10(summedMeanSquare);

  // Apply absolute gate (-70 LUFS)
  if (lufs < ABSOLUTE_GATE_THRESHOLD) {
    // Decay smoothly to -Infinity when gated
    if (state.smoothedLufs !== -Infinity) {
      state.smoothedLufs = state.smoothedLufs - 0.5;
      if (state.smoothedLufs < ABSOLUTE_GATE_THRESHOLD) {
        state.smoothedLufs = -Infinity;
      }
    }
    return state.smoothedLufs;
  }

  // Smooth the output for display stability
  const smoothingFactor = 0.3;
  if (state.smoothedLufs === -Infinity) {
    state.smoothedLufs = lufs;
  } else {
    state.smoothedLufs =
      state.smoothedLufs + smoothingFactor * (lufs - state.smoothedLufs);
  }

  return state.smoothedLufs;
}

/**
 * Calculate LUFS from separate stereo analysers
 * Use this for proper stereo metering with split channels
 */
export function calculateShortTermLufsStereo(
  analyserL: AnalyserNode,
  analyserR: AnalyserNode,
  state: LufsState,
): number {
  const bufferLength = analyserL.fftSize;
  const dataArrayL = new Float32Array(bufferLength);
  const dataArrayR = new Float32Array(bufferLength);

  analyserL.getFloatTimeDomainData(dataArrayL);
  analyserR.getFloatTimeDomainData(dataArrayR);

  // Process samples through K-weighting and store in ring buffer
  for (let i = 0; i < bufferLength; i++) {
    const kWeightedL = applyKWeightingSample(
      dataArrayL[i],
      state.kWeightL,
      state.highShelfCoefs,
      state.highPassCoefs,
    );
    const kWeightedR = applyKWeightingSample(
      dataArrayR[i],
      state.kWeightR,
      state.highShelfCoefs,
      state.highPassCoefs,
    );

    state.bufferL[state.writeIndex] = kWeightedL;
    state.bufferR[state.writeIndex] = kWeightedR;
    state.writeIndex = (state.writeIndex + 1) % state.bufferL.length;
  }

  // Calculate mean square for each channel
  const msL = calculateMeanSquare(state.bufferL);
  const msR = calculateMeanSquare(state.bufferR);

  // Sum channels (L=1.0, R=1.0 for stereo)
  const summedMeanSquare = msL + msR;

  if (summedMeanSquare <= 0) {
    return -Infinity;
  }

  const lufs = -0.691 + 10 * Math.log10(summedMeanSquare);

  if (lufs < ABSOLUTE_GATE_THRESHOLD) {
    if (state.smoothedLufs !== -Infinity) {
      state.smoothedLufs = state.smoothedLufs - 0.5;
      if (state.smoothedLufs < ABSOLUTE_GATE_THRESHOLD) {
        state.smoothedLufs = -Infinity;
      }
    }
    return state.smoothedLufs;
  }

  const smoothingFactor = 0.3;
  if (state.smoothedLufs === -Infinity) {
    state.smoothedLufs = lufs;
  } else {
    state.smoothedLufs =
      state.smoothedLufs + smoothingFactor * (lufs - state.smoothedLufs);
  }

  return state.smoothedLufs;
}

/**
 * Format LUFS value for display
 */
export function formatLufs(lufs: number): string {
  if (lufs <= -60 || !isFinite(lufs)) {
    return "-Inf";
  }
  return lufs.toFixed(1);
}
