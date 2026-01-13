/**
 * Vinyl Buffer AudioWorklet Processor
 *
 * Manages a circular buffer that allows playback at variable rates.
 * When playbackRate < 1.0, the buffer accumulates data.
 * When playbackRate > 1.0, the buffer catches up.
 *
 * Place this file in: public/worklets/vinyl-buffer.worklet.js
 */

class VinylBufferProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Buffer configuration with lazy growth
    // Start small (30 seconds ~4.8MB) and grow if needed
    this.initialBufferSeconds = 30;
    this.maxBufferSeconds = 180; // 3 minutes max
    this.currentBufferSeconds = this.initialBufferSeconds;
    this.bufferSize = Math.floor(sampleRate * this.currentBufferSeconds);
    this.maxBufferSize = Math.floor(sampleRate * this.maxBufferSeconds);

    // Growth threshold - grow when buffer reaches 80% capacity
    this.growthThreshold = 0.8;
    this.growthFactor = 2; // Double buffer size on growth

    // Circular buffers (stereo)
    this.bufferL = new Float32Array(this.bufferSize);
    this.bufferR = new Float32Array(this.bufferSize);

    // Positions
    this.writePos = 0; // Where new audio goes in
    this.readPos = 0; // Where we read from (fractional for interpolation)

    // Current state
    this.playbackRate = 1.0;
    this.targetPlaybackRate = 1.0;
    this.smoothingFactor = 0.001; // Faster response (was 0.0001 - 10x faster now)

    // Stats
    this.bufferFillLevel = 0;

    // Handle messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === "flush") {
        this.flush();
      } else if (event.data.type === "getStats") {
        this.sendStats();
      }
    };
  }

  static get parameterDescriptors() {
    return [
      {
        name: "playbackRate",
        defaultValue: 1.0,
        minValue: 0.5,
        maxValue: 2.0,
        automationRate: "k-rate",
      },
    ];
  }

  flush() {
    // Reset buffer to empty state
    this.readPos = this.writePos;
    this.bufferFillLevel = 0;
    console.log("[VinylBuffer] Buffer flushed");
  }

  growBuffer() {
    const newSeconds = Math.min(
      this.currentBufferSeconds * this.growthFactor,
      this.maxBufferSeconds,
    );

    if (newSeconds <= this.currentBufferSeconds) {
      return false; // Already at max size
    }

    const newSize = Math.floor(sampleRate * newSeconds);
    const newBufferL = new Float32Array(newSize);
    const newBufferR = new Float32Array(newSize);

    // Copy existing data preserving circular buffer order
    const backlog = this.getBacklogSamples();
    const readPosFloor = Math.floor(this.readPos);

    for (let i = 0; i < backlog; i++) {
      const oldIdx = (readPosFloor + i) % this.bufferSize;
      newBufferL[i] = this.bufferL[oldIdx];
      newBufferR[i] = this.bufferR[oldIdx];
    }

    // Update state
    this.bufferL = newBufferL;
    this.bufferR = newBufferR;
    this.readPos = this.readPos - readPosFloor; // Preserve fractional part
    this.writePos = backlog;
    this.bufferSize = newSize;
    this.currentBufferSeconds = newSeconds;

    const memoryMB = Math.round((newSize * 2 * 4) / 1024 / 1024);
    console.log(
      `[VinylBuffer] Buffer grown to ${newSeconds}s (~${memoryMB}MB)`,
    );
    return true;
  }

  sendStats() {
    const backlogSamples = this.getBacklogSamples();
    const backlogSeconds = backlogSamples / sampleRate;

    this.port.postMessage({
      type: "stats",
      backlogSeconds,
      bufferUtilization: backlogSamples / this.bufferSize,
      currentPlaybackRate: this.playbackRate,
    });
  }

  getBacklogSamples() {
    // How many samples are buffered but not yet played
    let backlog = this.writePos - Math.floor(this.readPos);
    if (backlog < 0) {
      backlog += this.bufferSize;
    }
    return backlog;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // Get target playback rate from parameter
    const targetRate = parameters.playbackRate[0] || 1.0;
    this.targetPlaybackRate = Math.max(0.5, Math.min(2.0, targetRate));

    // Smooth playback rate changes
    this.playbackRate +=
      (this.targetPlaybackRate - this.playbackRate) * this.smoothingFactor;

    const blockSize = output[0]?.length || 128;

    // Handle mono or stereo input
    const inputL = input[0] || new Float32Array(blockSize);
    const inputR = input[1] || inputL; // Fallback to mono (duplicate L channel)

    const outputL = output[0];
    // Handle stereo output - use output[1] if available, otherwise duplicate to output[0]
    const outputR = output[1] || outputL;

    // Write incoming audio to buffer
    for (let i = 0; i < blockSize; i++) {
      this.bufferL[this.writePos] = inputL[i];
      this.bufferR[this.writePos] = inputR[i];
      this.writePos = (this.writePos + 1) % this.bufferSize;
    }

    // Check buffer utilization and grow if needed
    const backlog = this.getBacklogSamples();
    if (backlog > this.bufferSize * this.growthThreshold) {
      // Try to grow buffer before forcing speed up
      if (!this.growBuffer()) {
        // At max size, force speed up to catch up
        if (backlog > this.bufferSize * 0.9) {
          console.warn("[VinylBuffer] Buffer overflow imminent, speeding up");
          this.playbackRate = Math.max(this.playbackRate, 1.5);
        }
      }
    }

    // Read from buffer at playback rate
    for (let i = 0; i < blockSize; i++) {
      // Make sure we have audio to read
      if (this.getBacklogSamples() < 2) {
        // Underrun - pass through input directly instead of silence
        // This creates a smooth transition when buffer is filling up
        outputL[i] = inputL[i];
        outputR[i] = inputR[i];
        continue;
      }

      // Linear interpolation for smooth playback at non-integer positions
      const readPosFloor = Math.floor(this.readPos);
      const frac = this.readPos - readPosFloor;

      const idx1 = readPosFloor % this.bufferSize;
      const idx2 = (readPosFloor + 1) % this.bufferSize;

      outputL[i] = this.bufferL[idx1] * (1 - frac) + this.bufferL[idx2] * frac;
      outputR[i] = this.bufferR[idx1] * (1 - frac) + this.bufferR[idx2] * frac;

      // Advance read position based on playback rate
      this.readPos += this.playbackRate;

      // Wrap read position
      if (this.readPos >= this.bufferSize) {
        this.readPos -= this.bufferSize;
      }
    }

    // Periodically send stats
    if (Math.random() < 0.01) {
      // ~1% of blocks
      this.sendStats();
    }

    return true;
  }
}

registerProcessor("vinyl-buffer-processor", VinylBufferProcessor);
