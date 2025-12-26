/**
 * OutputNode - Final gain stage with analyser for metering
 */

import { dbToLinear } from '../../utils/dsp-math';

export class OutputNode {
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect gain to analyser
    this.gainNode.connect(this.analyserNode);
    
    // Connect analyser to destination (system output)
    this.analyserNode.connect(ctx.destination);
  }

  /**
   * Get input node for connection
   */
  getInput(): AudioNode {
    return this.gainNode;
  }

  /**
   * Set output gain in dB
   */
  setGain(db: number): void {
    this.gainNode.gain.value = dbToLinear(db);
  }

  /**
   * Get analyser node for metering
   */
  getAnalyser(): AnalyserNode {
    return this.analyserNode;
  }

  /**
   * Connect source to this node (for legacy compatibility)
   */
  connect(source: AudioNode): void {
    source.connect(this.gainNode);
  }

  /**
   * Disconnect input
   */
  disconnect(): void {
    // Output node is always connected to destination
    // This disconnects any input source
  }
}
