/**
 * VinylModeNode - Manages the audio processing for vinyl/slowed mode
 *
 * Signal Chain:
 *   Input → Buffer (variable speed) → [Dry] ─────────────→ Mixer → Boost (+8dB) → Output
 *                                    → [Convolver] → Wet ──↗
 *
 * Bypass path: Input → Bypass → Output
 */

export class VinylModeNode {
  private ctx: AudioContext;
  private inputGain: GainNode;
  private outputGain: GainNode;

  // Processing nodes
  private bufferNode: AudioWorkletNode | null = null;
  private pitchShifter: AudioWorkletNode | null = null;
  private convolver: ConvolverNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;
  private vinylMixerGain: GainNode;
  private vinylBoostGain: GainNode; // +8dB boost when vinyl active

  // Bypass routing
  private bypassGain: GainNode;
  private isBypassed: boolean = true;
  private isInitialized: boolean = false;

  // State
  private currentReverbWet: number = 0;

  // Gain boost for reverb volume loss (8dB ≈ 2.5 linear)
  private static readonly REVERB_GAIN_COMPENSATION = 2.5;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Create nodes
    this.inputGain = ctx.createGain();
    this.outputGain = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.reverbGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.vinylMixerGain = ctx.createGain();
    this.vinylBoostGain = ctx.createGain();

    // Initial state: bypass active, vinyl path muted
    this.reverbGain.gain.value = 0; // Reverb starts off
    this.dryGain.gain.value = 1; // Dry signal full
    this.vinylMixerGain.gain.value = 0; // Vinyl path muted (bypassed)
    this.vinylBoostGain.gain.value = 1; // No boost initially
    this.bypassGain.gain.value = 1; // Bypass path active

    // Connect bypass path (default) - bypass goes to output
    this.inputGain.connect(this.bypassGain);
    this.bypassGain.connect(this.outputGain);

    // Connect vinyl path: vinylMixer → vinylBoost → output
    this.vinylMixerGain.connect(this.vinylBoostGain);
    this.vinylBoostGain.connect(this.outputGain);
  }

  /**
   * Initialize AudioWorklet processors and load reverb IR
   * Call this once after creating the node
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load pitch shifter worklet
      this.pitchShifter = new AudioWorkletNode(
        this.ctx,
        "pitch-shifter-processor",
      );

      // Load vinyl buffer worklet (handles variable playback rate)
      this.bufferNode = new AudioWorkletNode(
        this.ctx,
        "vinyl-buffer-processor",
      );

      // Connect processing chain:
      // Buffer → Dry path → vinylMixer
      // Buffer → Convolver → Reverb gain → vinylMixer
      this.bufferNode.connect(this.dryGain);
      this.bufferNode.connect(this.convolver);
      this.convolver.connect(this.reverbGain);

      this.dryGain.connect(this.vinylMixerGain);
      this.reverbGain.connect(this.vinylMixerGain);

      // Use synthetic short reverb (low CPU, consistent behavior)
      this.convolver.buffer = this.createShortReverb();

      this.isInitialized = true;
      console.log("[VinylModeNode] Worklets and IR initialized");
    } catch (err) {
      console.error("[VinylModeNode] Failed to initialize:", err);
      // Fallback: continue without worklets (will use bypass only)
      this.isInitialized = true;
    }
  }

  /**
   * Create a short synthetic reverb impulse response
   * Low CPU, ~0.8 second decay, warm character
   */
  private createShortReverb(): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.8); // 0.8 seconds
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with random noise
        const t = i / sampleRate;
        const decay = Math.exp(-5 * t); // Fast decay (~0.8s to near-silent)
        const noise = Math.random() * 2 - 1;
        // Add slight stereo difference for width
        const stereoOffset = channel === 0 ? 0.95 : 1.05;
        data[i] = noise * decay * 0.5 * stereoOffset;
      }
    }

    console.log("[VinylModeNode] Created synthetic short reverb");
    return buffer;
  }

  /**
   * Get input node for connection
   */
  getInput(): GainNode {
    return this.inputGain;
  }

  /**
   * Get output node for connection
   */
  getOutput(): GainNode {
    return this.outputGain;
  }

  /**
   * Set bypass state
   */
  setBypass(bypassed: boolean): void {
    this.isBypassed = bypassed;
    this.updateRouting();
  }

  /**
   * Get bypass state
   */
  getBypass(): boolean {
    return this.isBypassed;
  }

  /**
   * Update routing based on bypass state with crossfade
   */
  private updateRouting(): void {
    const crossfadeTime = 0.05; // 50ms crossfade
    const now = this.ctx.currentTime;

    if (this.isBypassed || !this.isInitialized || !this.bufferNode) {
      // Transitioning to bypass: crossfade from vinyl to bypass
      // First connect both paths
      try {
        this.inputGain.connect(this.bypassGain);
        // eslint-disable-next-line no-empty
      } catch {}

      // Fade bypass in
      this.bypassGain.gain.cancelScheduledValues(now);
      this.bypassGain.gain.setValueAtTime(this.bypassGain.gain.value, now);
      this.bypassGain.gain.linearRampToValueAtTime(1, now + crossfadeTime);

      // Fade vinyl mixer out (this controls the entire vinyl path including reverb)
      this.vinylMixerGain.gain.cancelScheduledValues(now);
      this.vinylMixerGain.gain.setValueAtTime(
        this.vinylMixerGain.gain.value,
        now,
      );
      this.vinylMixerGain.gain.linearRampToValueAtTime(0, now + crossfadeTime);

      // Reset reverb mix when bypassing
      this.reverbGain.gain.cancelScheduledValues(now);
      this.reverbGain.gain.linearRampToValueAtTime(0, now + crossfadeTime);
      this.dryGain.gain.cancelScheduledValues(now);
      this.dryGain.gain.linearRampToValueAtTime(1, now + crossfadeTime);

      // Disconnect buffer after crossfade
      setTimeout(
        () => {
          if (this.isBypassed) {
            try {
              this.inputGain.disconnect(this.bufferNode!);
              // eslint-disable-next-line no-empty
            } catch {}
          }
        },
        crossfadeTime * 1000 + 10,
      );
    } else {
      // Transitioning to active: crossfade from bypass to vinyl
      // First connect both paths
      try {
        this.inputGain.connect(this.bufferNode);
        // eslint-disable-next-line no-empty
      } catch {}

      // Fade vinyl mixer in - start at 1.0, compensation will be applied by rampReverbMix
      this.vinylMixerGain.gain.cancelScheduledValues(now);
      this.vinylMixerGain.gain.setValueAtTime(
        this.vinylMixerGain.gain.value,
        now,
      );
      this.vinylMixerGain.gain.linearRampToValueAtTime(
        1.0,
        now + crossfadeTime,
      );

      // Fade bypass out
      this.bypassGain.gain.cancelScheduledValues(now);
      this.bypassGain.gain.setValueAtTime(this.bypassGain.gain.value, now);
      this.bypassGain.gain.linearRampToValueAtTime(0, now + crossfadeTime);

      // Disconnect bypass after crossfade
      setTimeout(
        () => {
          if (!this.isBypassed) {
            try {
              this.inputGain.disconnect(this.bypassGain);
              // eslint-disable-next-line no-empty
            } catch {}
          }
        },
        crossfadeTime * 1000 + 10,
      );
    }
  }

  /**
   * Set pitch shift amount (currently unused)
   */
  setPitchShift(semitones: number): void {
    if (this.pitchShifter) {
      const param = this.pitchShifter.parameters.get("pitchShift");
      if (param) {
        param.setValueAtTime(semitones, this.ctx.currentTime);
      }
    }
  }

  /**
   * Smoothly ramp pitch shift (currently unused)
   */
  rampPitchShift(semitones: number, durationMs: number): void {
    if (this.pitchShifter) {
      const param = this.pitchShifter.parameters.get("pitchShift");
      if (param) {
        param.linearRampToValueAtTime(
          semitones,
          this.ctx.currentTime + durationMs / 1000,
        );
      }
    }
  }

  /**
   * Set reverb wet/dry mix
   * @param wet - 0 to 1, where 0 is fully dry
   */
  setReverbMix(wet: number): void {
    this.currentReverbWet = Math.max(0, Math.min(1, wet));
    const dry = 1 - this.currentReverbWet;
    this.reverbGain.gain.setValueAtTime(
      this.currentReverbWet,
      this.ctx.currentTime,
    );
    this.dryGain.gain.setValueAtTime(dry, this.ctx.currentTime);

    // Set boost proportionally: 0% wet = 1.0x, 75% wet = 2.5x (+8dB)
    const TARGET_WET = 0.75;
    const normalizedWet = Math.min(1, wet / TARGET_WET);
    const boostAmount =
      1.0 + normalizedWet * (VinylModeNode.REVERB_GAIN_COMPENSATION - 1.0);
    this.vinylBoostGain.gain.setValueAtTime(boostAmount, this.ctx.currentTime);
  }

  /**
   * Smoothly ramp reverb mix and boost
   */
  rampReverbMix(wet: number, durationMs: number): void {
    this.currentReverbWet = Math.max(0, Math.min(1, wet));
    const dry = 1 - this.currentReverbWet;
    const now = this.ctx.currentTime;
    const endTime = now + durationMs / 1000;

    // Cancel any previous ramps
    this.reverbGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.cancelScheduledValues(now);
    this.vinylBoostGain.gain.cancelScheduledValues(now);

    this.reverbGain.gain.setValueAtTime(this.reverbGain.gain.value, now);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    this.vinylBoostGain.gain.setValueAtTime(
      this.vinylBoostGain.gain.value,
      now,
    );

    // Ramp wet/dry mix
    this.reverbGain.gain.linearRampToValueAtTime(
      this.currentReverbWet,
      endTime,
    );
    this.dryGain.gain.linearRampToValueAtTime(dry, endTime);

    // Ramp boost gradually with reverb: 0% wet = 1.0x, 75% wet = 2.5x (+8dB)
    const TARGET_WET = 0.75;
    const normalizedWet = Math.min(1, wet / TARGET_WET);
    const boostAmount =
      1.0 + normalizedWet * (VinylModeNode.REVERB_GAIN_COMPENSATION - 1.0);
    this.vinylBoostGain.gain.linearRampToValueAtTime(boostAmount, endTime);

    console.log(
      `[VinylModeNode] Ramping: wet=${wet}, boost=${boostAmount.toFixed(2)}x`,
    );
  }

  /**
   * Set playback rate (affects buffer consumption)
   * @param rate - 1.0 is normal, 0.733 is 33/45 vinyl speed
   */
  setPlaybackRate(rate: number): void {
    if (this.bufferNode) {
      const param = this.bufferNode.parameters.get("playbackRate");
      if (param) {
        param.setValueAtTime(rate, this.ctx.currentTime);
      }
    }
  }

  /**
   * Smoothly ramp playback rate
   */
  rampPlaybackRate(rate: number, durationMs: number): void {
    if (this.bufferNode) {
      const param = this.bufferNode.parameters.get("playbackRate");
      if (param) {
        param.linearRampToValueAtTime(
          rate,
          this.ctx.currentTime + durationMs / 1000,
        );
      }
    }
  }

  /**
   * Flush the buffer (used when exiting vinyl mode)
   */
  flushBuffer(): void {
    if (this.bufferNode) {
      this.bufferNode.port.postMessage({ type: "flush" });
    }
  }

  /**
   * Connect this node to destination (standard AudioNode pattern)
   */
  connect(destination: AudioNode): void {
    this.outputGain.connect(destination);
  }

  /**
   * Disconnect output from destination
   */
  disconnect(): void {
    this.outputGain.disconnect();
  }

  /**
   * Restore internal routing (call after reconnection)
   */
  restoreRouting(): void {
    this.updateRouting();
  }
}
