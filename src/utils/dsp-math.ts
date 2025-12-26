/**
 * DSP utility functions for audio processing
 */

/**
 * Convert decibels to linear gain
 * @param db - Gain in decibels
 * @returns Linear gain value
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to decibels
 * @param linear - Linear gain value
 * @returns Gain in decibels
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Smooth parameter change using setTargetAtTime
 * @param param - AudioParam to set
 * @param value - Target value
 * @param audioContext - AudioContext for currentTime
 * @param timeConstant - Time constant in seconds (default 0.01)
 */
export function smoothParam(
  param: AudioParam,
  value: number,
  audioContext: AudioContext,
  timeConstant: number = 0.01
): void {
  param.setTargetAtTime(value, audioContext.currentTime, timeConstant);
}

