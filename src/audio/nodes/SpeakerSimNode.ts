/**
 * SpeakerSimNode - ConvolverNode for speaker cabinet simulation
 * Deferred implementation - requires impulse response files
 */

export class SpeakerSimNode {
  private convolver: ConvolverNode;
  private bypassGain: GainNode;
  private ctx: AudioContext;
  private isBypassed: boolean = true; // Bypassed by default (no IR loaded)

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.convolver = ctx.createConvolver();
    this.bypassGain = ctx.createGain();

    // Default: bypass (no IR loaded)
    // When bypassed, signal goes through bypassGain
    // When active, signal goes through convolver
  }

  /**
   * Get input node for connection
   * @returns ConvolverNode when active, GainNode when bypassed
   */
  getInput(): AudioNode {
    // When bypassed, return bypassGain; when active, return convolver
    return this.isBypassed ? this.bypassGain : this.convolver;
  }

  /**
   * Load impulse response from URL
   * @param url - URL to the impulse response audio file
   */
  async loadImpulseResponse(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.convolver.buffer = audioBuffer;
      this.isBypassed = false;
    } catch (error) {
      console.error("Failed to load impulse response:", error);
    }
  }

  /**
   * Set bypass state
   * @param bypassed - True to bypass processing, false to enable convolution
   */
  setBypass(bypassed: boolean): void {
    this.isBypassed = bypassed;
  }

  /**
   * Get bypass state
   * @returns True if bypassed, false if processing
   */
  getBypass(): boolean {
    return this.isBypassed;
  }

  /**
   * Connect to destination
   * @param destination - AudioNode to connect output to
   */
  connect(destination: AudioNode): void {
    if (this.isBypassed) {
      this.bypassGain.connect(destination);
    } else {
      this.convolver.connect(destination);
    }
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    this.bypassGain.disconnect();
    this.convolver.disconnect();
  }
}
