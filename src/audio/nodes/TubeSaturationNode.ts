/**
 * TubeSaturationNode - AudioWorklet host for the multiband Koren tube stage.
 *
 * The worklet has no parameters by design: the tubes are always in the path and
 * the only way to act on them is the level fed in (the IN gain), like pushing a
 * real amp. This class only owns routing and bypass.
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
   * Initialize the AudioWorklet node.
   * Must be called after AudioEngine has loaded the worklet.
   */
  async initialize(): Promise<void> {
    try {
      this.workletNode = new AudioWorkletNode(this.ctx, "tube-saturation");
      this.workletNode.connect(this.bypassGain);
      this.updateRouting();
    } catch (error) {
      console.error("Failed to create AudioWorkletNode:", error);
      // Fallback: use bypass gain only (no saturation)
    }
  }

  /**
   * Set bypass state.
   * @param bypassed - True to bypass processing, false to enable
   */
  setBypass(bypassed: boolean): void {
    this.isBypassed = bypassed;
    this.updateRouting();
  }

  /**
   * Get bypass state.
   * @returns True if bypassed, false if processing
   */
  getBypass(): boolean {
    return this.isBypassed;
  }

  /**
   * Connect this node to destination (standard AudioNode pattern).
   * @param destination - AudioNode to connect output to
   */
  connect(destination: AudioNode): void {
    this.bypassGain.connect(destination);
  }

  /**
   * Disconnect output from destination.
   * Only disconnects the output, preserves internal routing.
   */
  disconnect(): void {
    this.bypassGain.disconnect();
    // Don't disconnect workletNode - it's internal routing
  }

  /**
   * Restore internal routing (call after reconnection).
   * Ensures worklet node is properly connected to bypass gain.
   */
  restoreRouting(): void {
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {
        // Already disconnected
      }
      this.workletNode.connect(this.bypassGain);
    }
    this.updateRouting();
  }

  /**
   * Update routing based on bypass state.
   */
  private updateRouting(): void {
    this.inputGain.disconnect();

    if (this.isBypassed || !this.workletNode) {
      this.inputGain.connect(this.bypassGain);
    } else {
      this.inputGain.connect(this.workletNode);
    }
  }
}
