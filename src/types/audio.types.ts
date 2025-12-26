/**
 * Audio parameter interfaces and types
 */

export interface AudioParams {
  gainDb: number;      // Always in dB, convert to linear when needed
  frequency: number;   // Always in Hz
  q: number;          // Quality factor
}

export interface PresetConfig {
  name: string;
  description?: string;
  // Tone Stack
  bass: number;       // dB (-12 to +12)
  mid: number;        // dB
  treble: number;     // dB
  presence: number;   // dB
  // Saturation
  drive: number;      // 0-1 saturation amount
  harmonics?: number; // 0-1 harmonic generation
  saturationMix?: number; // 0-1 dry/wet
  // Gain
  inputGain?: number; // dB (optional)
  outputGain?: number; // dB (optional)
  // Module activation (false = active, true = bypassed)
  bypassToneStack?: boolean;
  bypassSaturation?: boolean;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface PresetCollection {
  [presetId: string]: PresetConfig;
}
