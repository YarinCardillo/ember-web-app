/**
 * TubeSaturationProcessor - AudioWorklet for tube saturation with harmonics
 * 
 * Parameters:
 * - drive: 0-1, amount of saturation
 * - harmonics: 0-1, amount of harmonic generation
 * - mix: 0-1, dry/wet blend
 */

class TubeSaturationProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'drive',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate'
      },
      {
        name: 'harmonics',
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate'
      },
      {
        name: 'mix',
        defaultValue: 1.0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate'
      }
    ];
  }

  constructor() {
    super();
  }

  /**
   * Soft clipping using tanh-based saturation
   * @param {number} sample - Input sample
   * @param {number} drive - Drive amount (0-1)
   * @returns {number} Saturated sample
   */
  saturate(sample, drive) {
    if (drive < 0.001) return sample;
    const k = 2 * drive / (1 - drive + 0.001); // Avoid division by zero
    return Math.tanh(k * sample) / Math.tanh(k); // Normalize output
  }

  /**
   * Add even harmonics (2nd) - "warm" character
   * @param {number} sample - Input sample
   * @param {number} amount - Harmonic amount (0-1)
   * @returns {number} Sample with 2nd harmonic
   */
  addSecondHarmonic(sample, amount) {
    return sample + amount * 0.45 * sample * Math.abs(sample);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length) {
      return true;
    }

    const drive = parameters.drive;
    const harmonics = parameters.harmonics;
    const mix = parameters.mix;

    // Process each channel
    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; i++) {
        const drySample = inputChannel[i];
        
        // Get parameter values (handle both constant and variable rate)
        const driveValue = drive.length > 1 ? drive[i] : drive[0];
        const harmonicsValue = harmonics.length > 1 ? harmonics[i] : harmonics[0];
        const mixValue = mix.length > 1 ? mix[i] : mix[0];

        // Apply saturation
        let wetSample = this.saturate(drySample, driveValue);

        // Add harmonics if enabled (only even harmonics)
        if (harmonicsValue > 0.01) {
          // 2nd harmonic (even) - warm character
          wetSample = this.addSecondHarmonic(wetSample, harmonicsValue);
        }

        // Soft limit to prevent harsh clipping
        wetSample = Math.tanh(wetSample * 0.9) / 0.9;

        // Gain compensation: reduce output proportional to drive + harmonics
        // This keeps perceived loudness more consistent
        const gainCompensation = 1.0 / (1.0 + driveValue * 0.3 + harmonicsValue * 0.25);
        wetSample *= gainCompensation;

        // Dry/wet mix
        outputChannel[i] = drySample * (1 - mixValue) + wetSample * mixValue;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('tube-saturation', TubeSaturationProcessor);
