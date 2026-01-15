/**
 * SpeakerSimNode - ConvolverNode for speaker cabinet simulation
 * Deferred implementation - requires impulse response files
 *
 * Signal chain:
 *   inputGain → convolver → bypassGain (when active)
 *   inputGain → bypassGain (when bypassed)
 */

export class SpeakerSimNode {
  private inputGain: GainNode; // Common entry point
  private convolver: ConvolverNode;
  private bypassGain: GainNode; // Common output
  private ctx: AudioContext;
  private isBypassed: boolean = true; // Bypassed by default (no IR loaded)

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = 1.0;
    this.convolver = ctx.createConvolver();
    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 1.0;

    // Connect convolver output to bypassGain (common output)
    this.convolver.connect(this.bypassGain);

    // Initial routing: bypass (input → bypassGain)
    this.inputGain.connect(this.bypassGain);
  }

  /**
   * Update internal routing based on bypass state
   */
  private updateRouting(): void {
    // Disconnect input from everything
    this.inputGain.disconnect();

    if (this.isBypassed) {
      // Bypass: connect input directly to bypassGain (skip convolver)
      this.inputGain.connect(this.bypassGain);
    } else {
      // Process: connect input to convolver
      this.inputGain.connect(this.convolver);
    }
  }

  /**
   * Get input node for connection
   * @returns GainNode (inputGain) as common entry point
   */
  getInput(): AudioNode {
    return this.inputGain;
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
      this.updateRouting();
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
   * Connect to destination
   * @param destination - AudioNode to connect output to
   */
  connect(destination: AudioNode): void {
    // Always connect bypassGain (common output) to destination
    this.bypassGain.connect(destination);
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    // Only disconnect output (bypassGain), preserve internal routing
    this.bypassGain.disconnect();
  }
}
