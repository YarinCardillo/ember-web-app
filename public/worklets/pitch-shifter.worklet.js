/**
 * Pitch Shifter AudioWorklet Processor
 *
 * Uses a simple granular synthesis approach for real-time pitch shifting.
 * This is a simplified implementation - for production quality, consider
 * using a proper phase vocoder or the SoundTouchJS library.
 *
 * Place this file in: public/worklets/pitch-shifter.worklet.js
 */

class PitchShifterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Granular synthesis parameters
    this.grainSize = 2048; // Samples per grain
    this.overlap = 4; // Overlap factor
    this.hopSize = this.grainSize / this.overlap;
    // Overlap-add normalization: compensates for gain buildup from overlapping grains.
    // With Hann window and 4x overlap, theoretical gain is ~2x, so we scale by 0.5.
    this.overlapAddGain = 0.5;

    // Buffers
    this.inputBuffer = new Float32Array(this.grainSize * 2);
    this.outputBuffer = new Float32Array(this.grainSize * 2);
    this.grainWindow = this.createHannWindow(this.grainSize);

    // Positions
    this.inputWritePos = 0;
    this.outputWritePos = 0;
    this.outputReadPos = 0;

    // Hop counter for proper grain scheduling
    this.hopCounter = 0;

    // Current pitch ratio (semitones converted to ratio)
    this.pitchRatio = 1.0;
    this.targetPitchRatio = 1.0;
    this.smoothingFactor = 0.001;
  }

  static get parameterDescriptors() {
    return [
      {
        name: "pitchShift",
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        automationRate: "k-rate",
      },
    ];
  }

  createHannWindow(size) {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  semitonesToRatio(semitones) {
    return Math.pow(2, semitones / 12);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) {
      return true;
    }

    // Get pitch shift in semitones and convert to ratio
    const pitchShiftSemitones = parameters.pitchShift[0] || 0;
    this.targetPitchRatio = this.semitonesToRatio(pitchShiftSemitones);

    // Smooth pitch changes to avoid clicks
    this.pitchRatio +=
      (this.targetPitchRatio - this.pitchRatio) * this.smoothingFactor;

    const inputChannel = input[0];
    const outputChannel = output[0];
    const blockSize = inputChannel.length;

    // If no pitch shift, pass through
    if (Math.abs(this.pitchRatio - 1.0) < 0.001) {
      for (let i = 0; i < blockSize; i++) {
        outputChannel[i] = inputChannel[i];
      }
      return true;
    }

    // Process each sample
    for (let i = 0; i < blockSize; i++) {
      // Write input to circular buffer
      this.inputBuffer[this.inputWritePos] = inputChannel[i];
      this.inputWritePos = (this.inputWritePos + 1) % this.inputBuffer.length;

      // Read from output buffer
      const readPos = Math.floor(this.outputReadPos);
      const frac = this.outputReadPos - readPos;

      // Linear interpolation
      const idx1 = readPos % this.outputBuffer.length;
      const idx2 = (readPos + 1) % this.outputBuffer.length;
      outputChannel[i] =
        this.outputBuffer[idx1] * (1 - frac) + this.outputBuffer[idx2] * frac;

      // Advance read position based on pitch ratio
      this.outputReadPos += this.pitchRatio;

      // Clear already-read samples to prevent re-reading stale data
      this.outputBuffer[idx1] = 0;
    }

    // Generate new grains based on hop timing
    this.hopCounter += blockSize;
    if (this.hopCounter >= this.hopSize) {
      this.generateGrains();
      this.hopCounter -= this.hopSize;
    }

    return true;
  }

  generateGrains() {
    // Simple grain generation - overlap-add
    // In a full implementation, this would be more sophisticated

    const grainStart =
      (this.inputWritePos - this.grainSize + this.inputBuffer.length) %
      this.inputBuffer.length;

    for (let i = 0; i < this.grainSize; i++) {
      const inputIdx = (grainStart + i) % this.inputBuffer.length;
      const outputIdx = (this.outputWritePos + i) % this.outputBuffer.length;

      // Apply window and add to output with overlap-add normalization
      this.outputBuffer[outputIdx] +=
        this.inputBuffer[inputIdx] * this.grainWindow[i] * this.overlapAddGain;
    }

    this.outputWritePos =
      (this.outputWritePos + this.hopSize) % this.outputBuffer.length;
  }
}

registerProcessor("pitch-shifter-processor", PitchShifterProcessor);
