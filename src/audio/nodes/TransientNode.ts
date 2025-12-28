/**
 * TransientNode - AudioWorklet-based transient shaper (SPL Transient Designer style)
 * Processes only frequencies below 150Hz, leaving high frequencies unchanged
 */

export class TransientNode {
  private workletNode: AudioWorkletNode | null = null;
  private bypassGain: GainNode;
  public readonly inputGain: GainNode;
  private ctx: AudioContext;
  private isBypassed: boolean = false;

  // Crossover filters (150Hz split)
  private lowpassFilter: BiquadFilterNode;
  private highpassFilter: BiquadFilterNode;
  private sumGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputGain = ctx.createGain();
    this.bypassGain = ctx.createGain();
    this.sumGain = ctx.createGain();
    
    // Crossover at 150Hz (12dB/octave Linkwitz-Riley using Butterworth)
    this.lowpassFilter = ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 150;
    this.lowpassFilter.Q.value = 0.707; // Butterworth Q
    
    this.highpassFilter = ctx.createBiquadFilter();
    this.highpassFilter.type = 'highpass';
    this.highpassFilter.frequency.value = 150;
    this.highpassFilter.Q.value = 0.707; // Butterworth Q
    
    // Initially connect input to bypass (passthrough)
    this.inputGain.connect(this.bypassGain);
  }

  /**
   * Initialize the AudioWorklet node
   * Must be called after AudioEngine has loaded the worklet
   */
  async initialize(): Promise<void> {
    try {
      this.workletNode = new AudioWorkletNode(this.ctx, 'transient', {
        processorOptions: {
          sampleRate: this.ctx.sampleRate
        }
      });
      
      // Setup crossover routing:
      // inputGain -> [lowpass, highpass]
      // lowpass -> worklet -> sumGain
      // highpass -> sumGain
      // sumGain -> bypassGain
      this.inputGain.connect(this.lowpassFilter);
      this.inputGain.connect(this.highpassFilter);
      
      this.lowpassFilter.connect(this.workletNode);
      this.workletNode.connect(this.sumGain);
      
      this.highpassFilter.connect(this.sumGain);
      this.sumGain.connect(this.bypassGain);
      
      this.updateRouting();
    } catch (error) {
      console.error('Failed to create AudioWorkletNode:', error);
      // Fallback: use bypass gain only (no processing)
    }
  }

  /**
   * Update routing based on bypass state
   */
  private updateRouting(): void {
    // Disconnect input from everything
    this.inputGain.disconnect();

    if (this.isBypassed || !this.workletNode) {
      // Bypass: connect directly to output gain
      this.inputGain.connect(this.bypassGain);
    } else {
      // Process: connect to crossover filters
      this.inputGain.connect(this.lowpassFilter);
      this.inputGain.connect(this.highpassFilter);
    }
  }

  /**
   * Set attack amount (-1.0 to +1.0)
   * Positive = boost transients, negative = reduce transients
   */
  setAttack(attack: number): void {
    if (this.workletNode) {
      const attackParam = this.workletNode.parameters.get('attack');
      if (attackParam) {
        attackParam.value = Math.max(-1.0, Math.min(1.0, attack));
      }
    }
  }

  /**
   * Set sustain amount (-1.0 to +1.0)
   * Positive = boost body/sustain, negative = reduce body/sustain
   */
  setSustain(sustain: number): void {
    if (this.workletNode) {
      const sustainParam = this.workletNode.parameters.get('sustain');
      if (sustainParam) {
        sustainParam.value = Math.max(-1.0, Math.min(1.0, sustain));
      }
    }
  }

  /**
   * Set mix amount (0.0 to 1.0, dry/wet)
   */
  setMix(mix: number): void {
    if (this.workletNode) {
      const mixParam = this.workletNode.parameters.get('mix');
      if (mixParam) {
        mixParam.value = Math.max(0.0, Math.min(1.0, mix));
      }
    }
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
   * Connect this node to destination (standard AudioNode pattern)
   */
  connect(destination: AudioNode): void {
    this.bypassGain.connect(destination);
  }

  /**
   * Disconnect output from destination
   * Only disconnects the output, preserves internal routing
   */
  disconnect(): void {
    this.bypassGain.disconnect();
    // Don't disconnect internal nodes - they're part of internal routing
  }

  /**
   * Restore internal routing (call after reconnection)
   */
  restoreRouting(): void {
    if (this.workletNode) {
      // Ensure internal crossover routing is intact
      try {
        // Disconnect and reconnect crossover paths
        this.lowpassFilter.disconnect();
        this.highpassFilter.disconnect();
        this.workletNode.disconnect();
        this.sumGain.disconnect();
        
        // Rebuild crossover routing
        this.lowpassFilter.connect(this.workletNode);
        this.workletNode.connect(this.sumGain);
        this.highpassFilter.connect(this.sumGain);
        this.sumGain.connect(this.bypassGain);
      } catch {
        // Already disconnected or error - ignore
      }
    }
    this.updateRouting();
  }
}

