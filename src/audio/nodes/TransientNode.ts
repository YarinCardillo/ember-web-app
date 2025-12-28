/**
 * TransientNode - AudioWorklet-based transient shaper (SPL Transient Designer style)
 * Uses sidechain filtering: envelope detection on filtered bass, gain applied to fullband signal
 */

export class TransientNode {
  private workletNode: AudioWorkletNode | null = null;
  private bypassGain: GainNode;
  public readonly inputGain: GainNode;
  private ctx: AudioContext;
  private isBypassed: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputGain = ctx.createGain();
    this.bypassGain = ctx.createGain();
    
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
      
      // Simple fullband routing: inputGain → workletNode → bypassGain
      // Sidechain filtering happens inside the worklet
      this.workletNode.connect(this.bypassGain);
      
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
      // Process: connect to worklet (fullband, no crossover)
      this.inputGain.connect(this.workletNode);
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
   * Set sidechain filter frequency (100-300 Hz)
   * Lower frequencies are used for envelope detection
   */
  setSidechainFreq(freq: number): void {
    if (this.workletNode) {
      const freqParam = this.workletNode.parameters.get('sidechainFreq');
      if (freqParam) {
        freqParam.value = Math.max(100, Math.min(300, freq));
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
    // Don't disconnect workletNode - it's internal routing
  }

  /**
   * Restore internal routing (call after reconnection)
   */
  restoreRouting(): void {
    if (this.workletNode) {
      // Ensure worklet is connected to bypass gain
      try {
        this.workletNode.disconnect();
      } catch {
        // Already disconnected
      }
      this.workletNode.connect(this.bypassGain);
    }
    this.updateRouting();
  }
}
