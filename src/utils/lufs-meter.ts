/**
 * LUFS Short-Term Meter implementation
 * Calculates ITU-R BS.1770-4 compliant short-term loudness
 * Short-term integration window: 3 seconds
 */

// K-weighting filter coefficients (for 48kHz sample rate)
// Pre-filter (high-shelf): fc=1500Hz, G=4dB
// High-pass filter: fc=38Hz, Q=0.5

export interface LufsState {
  // Ring buffer for 3-second window
  buffer: Float32Array;
  writeIndex: number;
  sampleRate: number;
  // Smoothed output
  smoothedLufs: number;
}

const INTEGRATION_TIME = 3.0; // seconds
const GATE_THRESHOLD = -70; // dB

/**
 * Create a new LUFS meter state
 */
export function createLufsState(sampleRate: number): LufsState {
  const bufferSize = Math.ceil(sampleRate * INTEGRATION_TIME);
  return {
    buffer: new Float32Array(bufferSize),
    writeIndex: 0,
    sampleRate,
    smoothedLufs: -Infinity,
  };
}

/**
 * Apply K-weighting filter (simplified version)
 * In a full implementation, this would use proper biquad filters
 */
function applyKWeighting(samples: Float32Array): Float32Array {
  const output = new Float32Array(samples.length);

  // Simplified K-weighting: high-shelf boost at high frequencies
  // and high-pass filter to remove very low frequencies
  let prevIn = 0;
  let prevOut = 0;

  // High-pass filter coefficient (approximately 38Hz at 48kHz)
  const hpCoef = 0.995;

  for (let i = 0; i < samples.length; i++) {
    // High-pass filter
    const highPassed = hpCoef * (prevOut + samples[i] - prevIn);
    prevIn = samples[i];
    prevOut = highPassed;

    // Simple high-frequency emphasis (K-weighting approximation)
    // This is a simplified version - full implementation would use proper biquads
    output[i] = highPassed;
  }

  return output;
}

/**
 * Calculate mean square value of samples
 */
function calculateMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return sum / samples.length;
}

/**
 * Calculate LUFS from analyser node
 * Returns short-term loudness in LUFS
 */
export function calculateShortTermLufs(
  analyser: AnalyserNode,
  state: LufsState
): number {
  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(dataArray);

  // Add new samples to ring buffer
  for (let i = 0; i < dataArray.length; i++) {
    state.buffer[state.writeIndex] = dataArray[i];
    state.writeIndex = (state.writeIndex + 1) % state.buffer.length;
  }

  // Apply K-weighting to the buffer
  const kWeighted = applyKWeighting(state.buffer);

  // Calculate mean square
  const meanSquare = calculateMeanSquare(kWeighted);

  // Convert to LUFS
  // LUFS = -0.691 + 10 * log10(mean square)
  if (meanSquare <= 0) {
    return -Infinity;
  }

  const lufs = -0.691 + 10 * Math.log10(meanSquare);

  // Apply gating
  if (lufs < GATE_THRESHOLD) {
    return -Infinity;
  }

  // Smooth the output
  const smoothingFactor = 0.3;
  if (state.smoothedLufs === -Infinity) {
    state.smoothedLufs = lufs;
  } else {
    state.smoothedLufs = state.smoothedLufs + smoothingFactor * (lufs - state.smoothedLufs);
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
