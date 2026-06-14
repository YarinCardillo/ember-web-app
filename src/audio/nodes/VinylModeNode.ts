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
  private convolver: ConvolverNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;
  private vinylMixerGain: GainNode;
  private vinylBoostGain: GainNode; // fixed trim on the vinyl path (see VINYL_TRIM)

  // Bypass routing
  private bypassGain: GainNode;
  private isBypassed: boolean = true;
  private isInitialized: boolean = false;

  // State
  private currentReverbWet: number = 0;

  // The reverb's early-reflection taps sum coherently on sustained material and
  // lift the vinyl path ~3 dB. Trim it back so enabling vinyl stays level-matched.
  private static readonly VINYL_TRIM = 0.708; // -3 dB

  // Full vinyl ratio: 33⅓ / 45 ≈ 0.733 (authentic 45→33 RPM)
  private static readonly VINYL_RATIO_FULL = 33 / 45;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Create nodes
    this.inputGain = ctx.createGain();
    this.outputGain = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.convolver = ctx.createConvolver();
    // Keep the raw IR amplitudes: with normalize on, a short/sparse IR would be
    // boosted back to equal loudness, hiding the faster decay we want.
    this.convolver.normalize = false;
    this.reverbGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.vinylMixerGain = ctx.createGain();
    this.vinylBoostGain = ctx.createGain();

    // Initial state: bypass active, vinyl path muted
    this.reverbGain.gain.value = 0; // Reverb starts off
    this.dryGain.gain.value = 1; // Dry signal full
    this.vinylMixerGain.gain.value = 0; // Vinyl path muted (bypassed)
    this.vinylBoostGain.gain.value = VinylModeNode.VINYL_TRIM; // -3 dB trim
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
   * Create a short synthetic reverb impulse response: discrete early
   * reflections with a fast decay and almost no diffuse late tail. Gives a
   * close "in the room" slap rather than a long wash.
   */
  private createShortReverb(): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.16); // short: fast decay
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    // Discrete early reflections (delay in ms, amplitude), no long diffuse tail.
    const earlyReflections = [
      { ms: 7, amp: 0.5 },
      { ms: 13, amp: 0.4 },
      { ms: 21, amp: 0.3 },
      { ms: 31, amp: 0.22 },
      { ms: 43, amp: 0.14 },
    ];
    const DECAY = 24; // fast amplitude decay of the faint diffuse fill

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      const stereoOffset = channel === 0 ? 0.95 : 1.05;
      const skew = channel === 0 ? 0 : 2; // sample skew for stereo width

      // Faint, fast-decaying diffuse fill so the IR is not a bare comb.
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const noise = (Math.random() * 2 - 1) * 0.08;
        data[i] = noise * Math.exp(-DECAY * t) * stereoOffset;
      }

      // Stamp the discrete early reflections on top.
      for (const r of earlyReflections) {
        const idx = Math.floor((r.ms / 1000) * sampleRate) + skew;
        if (idx < length) data[idx] += r.amp * stereoOffset;
      }
    }

    console.log("[VinylModeNode] Created early-reflection reverb (fast decay)");
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
      } catch {
        // Connection already exists - safe to ignore
        console.debug("[VinylModeNode] Bypass connection already established");
      }

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
            } catch {
              // Already disconnected - safe to ignore
              console.debug("[VinylModeNode] Buffer already disconnected");
            }
          }
        },
        crossfadeTime * 1000 + 10,
      );
    } else {
      // Transitioning to active: crossfade from bypass to vinyl
      // First connect both paths
      try {
        this.inputGain.connect(this.bufferNode);
      } catch {
        // Connection already exists - safe to ignore
        console.debug("[VinylModeNode] Buffer connection already established");
      }

      // Fade vinyl mixer in (no level compensation: vinyl stays level-matched)
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
            } catch {
              // Already disconnected - safe to ignore
              console.debug("[VinylModeNode] Bypass already disconnected");
            }
          }
        },
        crossfadeTime * 1000 + 10,
      );
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

    this.reverbGain.gain.setValueAtTime(this.reverbGain.gain.value, now);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);

    // Ramp wet/dry mix
    this.reverbGain.gain.linearRampToValueAtTime(
      this.currentReverbWet,
      endTime,
    );
    this.dryGain.gain.linearRampToValueAtTime(dry, endTime);

    console.log(`[VinylModeNode] Ramping reverb: wet=${wet}`);
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
   * Convert intensity (0-1) to playback rate
   * @param intensity - 0.0 = no slowdown, 1.0 = full 45→33 RPM
   * @returns Playback rate (1.0 to 0.733)
   */
  private intensityToRate(intensity: number): number {
    // Interpolate: 1.0 → 0.733
    // intensity = 0.0 → rate = 1.0 (no change)
    // intensity = 0.3 → rate = 0.92 (-8% speed, sweet spot)
    // intensity = 0.5 → rate = 0.867 (-13% speed)
    // intensity = 1.0 → rate = 0.733 (-26.7% speed, authentic)
    return 1.0 - intensity * (1.0 - VinylModeNode.VINYL_RATIO_FULL);
  }

  /**
   * Set vinyl intensity (affects playback rate)
   * @param intensity - 0.0 = no slowdown, 1.0 = full 45→33 RPM
   */
  setIntensity(intensity: number): void {
    const rate = this.intensityToRate(intensity);
    this.setPlaybackRate(rate);
  }

  /**
   * Smoothly ramp vinyl intensity
   * @param intensity - 0.0 = no slowdown, 1.0 = full 45→33 RPM
   * @param durationMs - Ramp duration in milliseconds
   */
  rampIntensity(intensity: number, durationMs: number): void {
    const rate = this.intensityToRate(intensity);
    this.rampPlaybackRate(rate, durationMs);
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
