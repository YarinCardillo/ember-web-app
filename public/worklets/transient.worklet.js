/**
 * TransientProcessor - AudioWorklet for SPL Transient Designer-style processing
 * 
 * Dual envelope follower approach:
 * - Fast envelope: catches transients (attack ~0.1ms, release ~5ms)
 * - Slow envelope: follows body/sustain (attack ~10ms, release ~100ms)
 * 
 * Parameters:
 * - attack: -1.0 to +1.0, gain adjustment during transient phase
 * - sustain: -1.0 to +1.0, gain adjustment during sustain phase
 * - mix: 0.0 to 1.0, dry/wet blend
 */

class TransientProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'attack',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'a-rate'
      },
      {
        name: 'sustain',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'a-rate'
      },
      {
        name: 'mix',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate'
      }
    ];
  }

  constructor(options) {
    super(options);
    
    // Get sample rate from processor options or use default
    // sampleRate is a global in AudioWorkletProcessor context
    this.sampleRate = options.processorOptions?.sampleRate || (typeof sampleRate !== 'undefined' ? sampleRate : 48000);
    
    // Envelope follower state (per channel)
    this.fastEnv = [0.0, 0.0]; // Stereo
    this.slowEnv = [0.0, 0.0];
    
    // Smoothed gain (per channel) to avoid clicks
    this.smoothedGain = [1.0, 1.0];
    
    // Envelope coefficients (computed from time constants)
    // Fast: attack 0.1ms, release 5ms
    // Slow: attack 10ms, release 100ms
    // Gain smoothing: 5ms
    this.updateCoefficients();
  }

  /**
   * Update envelope coefficients based on sample rate
   * Uses one-pole filter: y[n] = y[n-1] + coeff * (x[n] - y[n-1])
   */
  updateCoefficients() {
    const sampleRate = this.sampleRate;
    
    // Fast envelope: attack 0.1ms, release 5ms
    this.fastAttackCoeff = 1.0 - Math.exp(-1.0 / (0.0001 * sampleRate));
    this.fastReleaseCoeff = 1.0 - Math.exp(-1.0 / (0.005 * sampleRate));
    
    // Slow envelope: attack 10ms, release 100ms
    this.slowAttackCoeff = 1.0 - Math.exp(-1.0 / (0.01 * sampleRate));
    this.slowReleaseCoeff = 1.0 - Math.exp(-1.0 / (0.1 * sampleRate));
    
    // Gain smoothing: 5ms to avoid clicks
    this.gainSmoothCoeff = 1.0 - Math.exp(-1.0 / (0.005 * sampleRate));
  }

  /**
   * Update envelope follower (one-pole filter)
   * @param {number} input - Absolute value of input sample
   * @param {number} currentEnv - Current envelope value
   * @param {number} attackCoeff - Attack coefficient
   * @param {number} releaseCoeff - Release coefficient
   * @returns {number} Updated envelope value
   */
  updateEnvelope(input, currentEnv, attackCoeff, releaseCoeff) {
    if (input > currentEnv) {
      // Attack phase
      return currentEnv + attackCoeff * (input - currentEnv);
    } else {
      // Release phase
      return currentEnv + releaseCoeff * (input - currentEnv);
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length) {
      return true;
    }

    // Sample rate is fixed per AudioContext, no need to check

    const attack = parameters.attack;
    const sustain = parameters.sustain;
    const mix = parameters.mix;

    // Process each channel
    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      // Get current envelope state for this channel
      let fastEnv = this.fastEnv[channel];
      let slowEnv = this.slowEnv[channel];
      let smoothedGain = this.smoothedGain[channel];

      for (let i = 0; i < inputChannel.length; i++) {
        const drySample = inputChannel[i];
        
        // Get parameter values (handle both constant and variable rate)
        const attackValue = attack.length > 1 ? attack[i] : attack[0];
        const sustainValue = sustain.length > 1 ? sustain[i] : sustain[0];
        const mixValue = mix.length > 1 ? mix[i] : mix[0];

        // Update envelopes using absolute value of input
        const absInput = Math.abs(drySample);
        fastEnv = this.updateEnvelope(absInput, fastEnv, this.fastAttackCoeff, this.fastReleaseCoeff);
        slowEnv = this.updateEnvelope(absInput, slowEnv, this.slowAttackCoeff, this.slowReleaseCoeff);

        // Compute ratio for transient detection
        // Add small epsilon to avoid division by zero
        const epsilon = 1e-10;
        const ratio = fastEnv / (slowEnv + epsilon);

        // Determine target gain based on phase
        // When ratio > 1: transient/attack phase
        // When ratio ≈ 1: sustain phase
        let targetGain;
        if (ratio > 1.0) {
          // Attack phase: apply attack parameter
          // Map attack (-1 to +1) to gain reduction/boost
          // Positive attack = boost transients, negative = reduce transients
          const transientAmount = ratio - 1.0; // How much above baseline
          targetGain = 1.0 + attackValue * transientAmount;
        } else {
          // Sustain phase: apply sustain parameter
          // Positive sustain = boost body, negative = reduce body
          const sustainAmount = 1.0 - ratio; // How much below baseline
          targetGain = 1.0 + sustainValue * sustainAmount;
        }

        // Smooth gain changes to avoid clicks
        smoothedGain = smoothedGain + this.gainSmoothCoeff * (targetGain - smoothedGain);

        // Apply gain to create wet signal
        const wetSample = drySample * smoothedGain;

        // Dry/wet mix
        outputChannel[i] = drySample * (1.0 - mixValue) + wetSample * mixValue;
      }

      // Store envelope state for next block
      this.fastEnv[channel] = fastEnv;
      this.slowEnv[channel] = slowEnv;
      this.smoothedGain[channel] = smoothedGain;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('transient', TransientProcessor);

