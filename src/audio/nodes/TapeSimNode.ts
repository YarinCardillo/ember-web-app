/**
 * TapeSimNode - Analog tape simulation with wow/flutter, head bump, HF rolloff, and odd harmonic saturation
 * 
 * Signal chain: Input → HeadBump → HFRolloff → WowFlutter → OddHarmonicSaturation → Output
 */

export class TapeSimNode {
  private headBumpFilter: BiquadFilterNode;
  private hfRolloffFilter: BiquadFilterNode;
  private wobbleWorklet: AudioWorkletNode | null = null;
  private oddHarmonicSaturator: WaveShaperNode;
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
    
    // Odd harmonic saturation: adds 3rd harmonic (tube character) at 100% intensity
    // Formula: output = input + 0.2 * input^3
    this.oddHarmonicSaturator = ctx.createWaveShaper();
    this.oddHarmonicSaturator.curve = this.createOddHarmonicCurve() as Float32Array<ArrayBuffer>;
    this.oddHarmonicSaturator.oversample = '4x'; // Reduce aliasing
    
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
      // HeadBump → HFRolloff → WowFlutter → OddHarmonicSaturation → Output
      this.hfRolloffFilter.connect(this.wobbleWorklet);
      this.wobbleWorklet.connect(this.oddHarmonicSaturator);
      this.oddHarmonicSaturator.connect(this.outputGain);
      
      this.isInitialized = true;
      console.log('TapeSimNode initialized successfully with wow/flutter');
    } catch (error) {
      console.error('Failed to create TapeWobble AudioWorkletNode:', error);
      // Fallback: connect filters + saturation directly (no wow/flutter)
      this.hfRolloffFilter.connect(this.oddHarmonicSaturator);
      this.oddHarmonicSaturator.connect(this.outputGain);
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

  /**
   * Create WaveShaper curve that adds odd harmonics with 1/n³ decay
   * Odd harmonics (3rd, 5th, 7th) create symmetric "tape" distortion
   * Always applied at 100% intensity (no user control)
   */
  private createOddHarmonicCurve(): Float32Array {
    const samples = 65537; // Odd number for symmetry, high resolution
    const curve = new Float32Array(samples);
    
    const baseCoeff = 1.0; // Base coefficient
    const harmonics = [3, 5, 7]; // Odd harmonic orders
    
    for (let i = 0; i < samples; i++) {
      // Map index to -1.0 to +1.0 range (standard Web Audio input range)
      const x = (i / (samples - 1)) * 2 - 1;
      
      let y = x; // Start with fundamental
      
      // Add odd harmonics with 1/n³ decay
      for (const n of harmonics) {
        const coeff = baseCoeff / (n * n * n); // 1/n³ decay
        // Odd harmonics: symmetric, use x^n
        y += coeff * Math.pow(x, n);
      }
      
      // Soft limit using tanh to prevent harsh clipping
      curve[i] = Math.tanh(y);
    }
    
    return curve;
  }
}

