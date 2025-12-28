/**
 * TransientProcessor - AudioWorklet for SPL Transient Designer-style processing
 * 
 * Sidechain filtering approach:
 * - Lowpass filter (150Hz default) applied to COPY of input for envelope detection
 * - Envelope detection runs on filtered signal (focuses on bass transients)
 * - Gain modulation applied to ORIGINAL fullband signal
 * 
 * Dual envelope follower:
 * - Fast envelope: catches transients (attack ~0.1ms, release ~5ms)
 * - Slow envelope: follows body/sustain (attack ~10ms, release ~100ms)
 * 
 * Parameters:
 * - attack: -1.0 to +1.0, gain adjustment during transient phase
 * - sustain: -1.0 to +1.0, gain adjustment during sustain phase
 * - mix: 0.0 to 1.0, dry/wet blend
 * - sidechainFreq: 100-300 Hz, lowpass cutoff for detector (default 150Hz)
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
      },
      {
        name: 'sidechainFreq',
        defaultValue: 150.0,
        minValue: 100.0,
        maxValue: 300.0,
        automationRate: 'k-rate' // Constant rate (rarely changes)
      }
    ];
  }

  constructor(options) {
    super(options);
    
    // Get sample rate from processor options or use default
    this.sampleRate = options.processorOptions?.sampleRate || (typeof sampleRate !== 'undefined' ? sampleRate : 48000);
    
    // Sidechain lowpass filter state (per channel)
    this.sidechainFiltered = [0.0, 0.0]; // Stereo
    
    // Envelope follower state (per channel)
    this.fastEnv = [0.0, 0.0]; // Stereo
    this.slowEnv = [0.0, 0.0];
    
    // Smoothed gain (per channel) to avoid clicks
    this.smoothedGain = [1.0, 1.0];
    
    // Sidechain filter coefficient (will be updated from sidechainFreq parameter)
    this.sidechainAlpha = 0.0;
    
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
   * Update sidechain lowpass filter coefficient
   * One-pole lowpass: filtered = filtered + alpha * (input - filtered)
   * where alpha = 1 - exp(-2π * freq / sampleRate)
   */
  updateSidechainCoeff(freq) {
    this.sidechainAlpha = 1.0 - Math.exp(-2.0 * Math.PI * freq / this.sampleRate);
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

    const attack = parameters.attack;
    const sustain = parameters.sustain;
    const mix = parameters.mix;
    const sidechainFreq = parameters.sidechainFreq;

    // Update sidechain filter coefficient if frequency changed
    const freqValue = sidechainFreq.length > 0 ? sidechainFreq[0] : sidechainFreq;
    this.updateSidechainCoeff(freqValue);

    // Process each channel
    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      // Get current state for this channel
      let sidechainFiltered = this.sidechainFiltered[channel];
      let fastEnv = this.fastEnv[channel];
      let slowEnv = this.slowEnv[channel];
      let smoothedGain = this.smoothedGain[channel];

      for (let i = 0; i < inputChannel.length; i++) {
        const drySample = inputChannel[i]; // Original fullband signal
        
        // Get parameter values (handle both constant and variable rate)
        const attackValue = attack.length > 1 ? attack[i] : attack[0];
        const sustainValue = sustain.length > 1 ? sustain[i] : sustain[0];
        const mixValue = mix.length > 1 ? mix[i] : mix[0];

        // SIDECHAIN PATH: Apply lowpass filter to COPY of input for detection
        sidechainFiltered = sidechainFiltered + this.sidechainAlpha * (drySample - sidechainFiltered);
        
        // Update envelopes using ABSOLUTE VALUE of FILTERED signal
        const absFiltered = Math.abs(sidechainFiltered);
        fastEnv = this.updateEnvelope(absFiltered, fastEnv, this.fastAttackCoeff, this.fastReleaseCoeff);
        slowEnv = this.updateEnvelope(absFiltered, slowEnv, this.slowAttackCoeff, this.slowReleaseCoeff);

        // Compute ratio for transient detection
        const epsilon = 1e-10;
        const ratio = fastEnv / (slowEnv + epsilon);

        // Determine target gain based on phase
        let targetGain;
        if (ratio > 1.0) {
          // Attack phase: apply attack parameter
          const transientAmount = ratio - 1.0;
          targetGain = 1.0 + attackValue * transientAmount;
        } else {
          // Sustain phase: apply sustain parameter
          const sustainAmount = 1.0 - ratio;
          targetGain = 1.0 + sustainValue * sustainAmount;
        }

        // Smooth gain changes to avoid clicks
        smoothedGain = smoothedGain + this.gainSmoothCoeff * (targetGain - smoothedGain);

        // AUDIO PATH: Apply gain to ORIGINAL fullband signal
        const wetSample = drySample * smoothedGain;

        // Dry/wet mix
        outputChannel[i] = drySample * (1.0 - mixValue) + wetSample * mixValue;
      }

      // Store state for next block
      this.sidechainFiltered[channel] = sidechainFiltered;
      this.fastEnv[channel] = fastEnv;
      this.slowEnv[channel] = slowEnv;
      this.smoothedGain[channel] = smoothedGain;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('transient', TransientProcessor);
