/**
 * TapeSimNode - Analog tape simulation with wow/flutter, head bump, and HF rolloff
 * 
 * Signal chain: Input → HeadBump → HFRolloff → WowFlutter → Output
 */

export class TapeSimNode {
  private headBumpFilter: BiquadFilterNode;
  private hfRolloffFilter: BiquadFilterNode;
  private wobbleWorklet: AudioWorkletNode | null = null;
  private outputGain: GainNode;
  private bypassGain: GainNode;
  private ctx: AudioContext;
  private isBypassed: boolean = false; // Active by default
  private isInitialized: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    
    // Head bump filter: subtle low-frequency boost (tape head resonance)
    this.headBumpFilter = ctx.createBiquadFilter();
    this.headBumpFilter.type = 'peaking';
    this.headBumpFilter.frequency.value = 80; // Hz
    this.headBumpFilter.Q.value = 0.7;
    this.headBumpFilter.gain.value = 2; // +2dB subtle warmth
    
    // HF rolloff filter: gentle high-frequency smoothing
    this.hfRolloffFilter = ctx.createBiquadFilter();
    this.hfRolloffFilter.type = 'lowpass';
    this.hfRolloffFilter.frequency.value = 15000; // Hz - subtle rolloff
    this.hfRolloffFilter.Q.value = 0.5;
    
    // Output gain (stereo processing handled in worklet)
    this.outputGain = ctx.createGain();
    this.outputGain.gain.value = 1.0;
    
    // Bypass gain
    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 1.0;
    
    // Connect processing chain (will be completed after worklet initialization)
    this.headBumpFilter.connect(this.hfRolloffFilter);
  }

  /**
   * Initialize the AudioWorklet node
   * Must be called after AudioEngine has loaded the worklet
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.wobbleWorklet = new AudioWorkletNode(this.ctx, 'tape-wobble');
      
      // Complete the signal chain
      // HeadBump → HFRolloff → WowFlutter → Output
      this.hfRolloffFilter.connect(this.wobbleWorklet);
      this.wobbleWorklet.connect(this.outputGain);
      
      this.isInitialized = true;
      console.log('TapeSimNode initialized successfully with wow/flutter');
    } catch (error) {
      console.error('Failed to create TapeWobble AudioWorkletNode:', error);
      // Fallback: connect filters directly (no wow/flutter)
      this.hfRolloffFilter.connect(this.outputGain);
      this.isInitialized = true;
      console.log('TapeSimNode initialized with fallback (filters only)');
    }
  }

  /**
   * Get input node for connection
   */
  getInput(): AudioNode {
    // When bypassed, return bypassGain; when active, return headBumpFilter
    return this.isBypassed ? this.bypassGain : this.headBumpFilter;
  }

  /**
   * Set bypass state
   */
  setBypass(bypassed: boolean): void {
    this.isBypassed = bypassed;
  }

  /**
   * Get bypass state
   */
  getBypass(): boolean {
    return this.isBypassed;
  }

  /**
   * Connect to destination
   */
  connect(destination: AudioNode): void {
    if (this.isBypassed) {
      this.bypassGain.connect(destination);
    } else {
      this.outputGain.connect(destination);
    }
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    this.bypassGain.disconnect();
    this.outputGain.disconnect();
  }
}

