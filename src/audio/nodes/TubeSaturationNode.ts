/**
 * TubeSaturationNode - AudioWorklet-based tube saturation with harmonics
 */

export class TubeSaturationNode {
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
      this.workletNode = new AudioWorkletNode(this.ctx, "tube-saturation");
      // Connect worklet output to bypass gain for routing
      this.workletNode.connect(this.bypassGain);
      this.updateRouting();
    } catch (error) {
      console.error("Failed to create AudioWorkletNode:", error);
      // Fallback: use bypass gain only (no saturation)
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
      // Process: connect to worklet
      this.inputGain.connect(this.workletNode);
    }
  }

  /**
   * Set drive amount
   * @param drive - Drive amount (0.0 to 1.0)
   */
  setDrive(drive: number): void {
    if (this.workletNode) {
      const driveParam = this.workletNode.parameters.get("drive");
      if (driveParam) {
        driveParam.value = Math.max(0, Math.min(1, drive));
      }
    }
  }

  /**
   * Set harmonics amount
   * @param harmonics - Harmonics intensity (0.0 to 1.0)
   */
  setHarmonics(harmonics: number): void {
    if (this.workletNode) {
      const harmonicsParam = this.workletNode.parameters.get("harmonics");
      if (harmonicsParam) {
        harmonicsParam.value = Math.max(0, Math.min(1, harmonics));
      }
    }
  }

  /**
   * Set mix amount (dry/wet blend)
   * @param mix - Mix amount (0.0 = dry, 1.0 = wet)
   */
  setMix(mix: number): void {
    if (this.workletNode) {
      const mixParam = this.workletNode.parameters.get("mix");
      if (mixParam) {
        mixParam.value = Math.max(0, Math.min(1, mix));
      }
    }
  }

  /**
   * Set bypass state
   * @param bypassed - True to bypass processing, false to enable
   */
  setBypass(bypassed: boolean): void {
    this.isBypassed = bypassed;
    this.updateRouting();
  }

  /**
   * Get bypass state
   * @returns True if bypassed, false if processing
   */
  getBypass(): boolean {
    return this.isBypassed;
  }

  /**
   * Connect this node to destination (standard AudioNode pattern)
   * @param destination - AudioNode to connect output to
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
   * Ensures worklet node is properly connected to bypass gain
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
