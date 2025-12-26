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
    return sample + amount * 0.3 * sample * Math.abs(sample);
  }

  /**
   * Add odd harmonics (3rd) - "tube" character
   * @param {number} sample - Input sample
   * @param {number} amount - Harmonic amount (0-1)
   * @returns {number} Sample with 3rd harmonic
   */
  addThirdHarmonic(sample, amount) {
    return sample + amount * 0.2 * Math.pow(sample, 3);
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

        // Add harmonics if enabled
        if (harmonicsValue > 0.01) {
          // 2nd harmonic (even) - warm character
          wetSample = this.addSecondHarmonic(wetSample, harmonicsValue);
          // 3rd harmonic (odd) - tube character
          wetSample = this.addThirdHarmonic(wetSample, harmonicsValue * 0.7);
        }

        // Soft limit to prevent harsh clipping
        wetSample = Math.tanh(wetSample * 0.9) / 0.9;

        // Dry/wet mix
        outputChannel[i] = drySample * (1 - mixValue) + wetSample * mixValue;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('tube-saturation', TubeSaturationProcessor);
