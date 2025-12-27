/**
 * TapeWobbleProcessor - AudioWorklet for tape wow/flutter pitch modulation
 * 
 * Implements multi-LFO pitch modulation using delay-based pitch shifting:
 * - Wow: ~0.5Hz, ±4 cents (slow tape speed variation)
 * - Flutter: ~7Hz, ±1.5 cents (faster mechanical vibration)
 * - Drift: ~0.1Hz, ±1 cent (slow organic drift)
 */

class TapeWobbleProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }

  constructor() {
    super();
    
    // Buffer size: ~50ms at 48kHz = ~2400 samples, use 4096 for safety
    this.bufferSize = 4096;
    this.bufferL = new Float32Array(this.bufferSize);
    this.bufferR = new Float32Array(this.bufferSize);
    this.writePos = 0;
    this.samplesWritten = 0; // Track total samples written for buffer ready check
    
    // Base delay: ~10ms for pitch modulation headroom (will be recalculated with actual sample rate)
    this.baseDelaySamples = 441; // ~10ms at 44.1kHz
    
    // LFO states (phase accumulators)
    this.wowPhase = 0;
    this.flutterPhase = 0;
    this.driftPhase = 0;
    this.stereoDelayPhase = 0; // For inter-channel delay variation
    
    // LFO frequencies (Hz)
    this.wowFreq = 0.5;
    this.flutterFreq = 7.0;
    this.driftFreq = 0.1;
    this.stereoDelayFreq = 0.1; // Slow stereo movement
    
    // LFO depths in samples (cents to delay conversion)
    // ±4 cents = ~0.23% pitch change = ~1 sample delay variation at base delay
    // ±1.5 cents = ~0.087% = ~0.38 samples
    // ±1 cent = ~0.058% = ~0.26 samples
    this.wowDepth = 1.0; // samples
    this.flutterDepth = 0.38; // samples
    this.driftDepth = 0.26; // samples
    
    // Dynamic inter-channel delay variation (0.1-0.5ms for analog feel)
    // At 48kHz: 0.3ms = ~14 samples
    // This adds stereo width by varying L/R timing independently
    this.stereoDelayDepth = 3; // samples (~0.06ms at 48kHz)
  }

  /**
   * Linear interpolation for fractional delay positions
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Wrap index to buffer bounds (handles negative correctly)
   */
  wrapIndex(idx) {
    return ((idx % this.bufferSize) + this.bufferSize) % this.bufferSize;
  }

  /**
   * Read from circular buffer with interpolation
   */
  readBuffer(buffer, position) {
    const idx = Math.floor(position);
    const frac = position - idx;
    
    const idx0 = this.wrapIndex(idx);
    const idx1 = this.wrapIndex(idx + 1);
    
    return this.lerp(buffer[idx0], buffer[idx1], frac);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input.length || !output || !output.length) {
      return true;
    }

    // Get sample rate (global property in AudioWorkletProcessor)
    const sr = sampleRate;
    
    // Recalculate base delay for actual sample rate (10ms) - only once
    if (this.baseDelaySamples === 441) {
      this.baseDelaySamples = Math.floor(sr * 0.01);
    }

    const channelCount = Math.min(input.length, output.length);
    const frameCount = input[0].length;

    // Process each sample
    for (let i = 0; i < frameCount; i++) {
      // Check if buffer has enough data
      const bufferReady = this.samplesWritten >= this.baseDelaySamples + 2;
      
      // Update LFO phases
      const phaseIncrement = 2.0 * Math.PI / sr;
      this.wowPhase += this.wowFreq * phaseIncrement;
      this.flutterPhase += this.flutterFreq * phaseIncrement;
      this.driftPhase += this.driftFreq * phaseIncrement;
      this.stereoDelayPhase += this.stereoDelayFreq * phaseIncrement;
      
      // Keep phases in range
      if (this.wowPhase > Math.PI * 2) this.wowPhase -= Math.PI * 2;
      if (this.flutterPhase > Math.PI * 2) this.flutterPhase -= Math.PI * 2;
      if (this.driftPhase > Math.PI * 2) this.driftPhase -= Math.PI * 2;
      if (this.stereoDelayPhase > Math.PI * 2) this.stereoDelayPhase -= Math.PI * 2;
      
      // Calculate LFO values for drift (shared between channels)
      const driftLFO = Math.sin(this.driftPhase) * this.driftDepth;
      
      // Inter-channel delay variation for stereo width
      // L and R get opposite delay offsets, creating dynamic stereo movement
      const stereoDelayLFO = Math.sin(this.stereoDelayPhase) * this.stereoDelayDepth;
      
      // Write input to separate L/R buffers
      const writeIdx = this.wrapIndex(this.writePos);
      this.bufferL[writeIdx] = channelCount > 0 ? input[0][i] : 0;
      this.bufferR[writeIdx] = channelCount > 1 ? input[1][i] : (channelCount > 0 ? input[0][i] : 0);
      
      // Read from buffer with modulated delay
      if (bufferReady) {
        // Shared wow/flutter modulation (both channels move together for pitch)
        const wowLFO = Math.sin(this.wowPhase) * this.wowDepth;
        const flutterLFO = Math.sin(this.flutterPhase) * this.flutterDepth;
        const sharedMod = wowLFO + flutterLFO + driftLFO;
        
        // Left channel: shared modulation + stereo delay offset
        const delayModL = sharedMod + stereoDelayLFO;
        const readPosL = this.writePos - this.baseDelaySamples - delayModL;
        
        if (channelCount > 0) {
          output[0][i] = this.readBuffer(this.bufferL, readPosL);
        }
        
        // Right channel: shared modulation - stereo delay offset (opposite direction)
        if (channelCount > 1) {
          const delayModR = sharedMod - stereoDelayLFO;
          const readPosR = this.writePos - this.baseDelaySamples - delayModR;
          output[1][i] = this.readBuffer(this.bufferR, readPosR);
        }
      } else {
        // Buffer not ready yet - pass through input directly
        if (channelCount > 0) output[0][i] = input[0][i];
        if (channelCount > 1) output[1][i] = input[1][i];
      }
      
      // Advance write position
      this.writePos = (this.writePos + 1) % this.bufferSize;
      this.samplesWritten++;
    }

    return true; // Keep processor alive
  }
}

registerProcessor('tape-wobble', TapeWobbleProcessor);

