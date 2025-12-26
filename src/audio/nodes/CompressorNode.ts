/**
 * CompressorNode - DynamicsCompressorNode wrapper with UI-friendly params
 */

export class CompressorNode {
  private compressor: DynamicsCompressorNode;
  private threshold: number = -24; // dB
  private ratio: number = 4; // 4:1
  private attack: number = 0.003; // 3ms
  private release: number = 0.25; // 250ms
  private knee: number = 30; // dB

  constructor(ctx: AudioContext) {
    this.compressor = ctx.createDynamicsCompressor();
    this.updateParams();
  }

  /**
   * Get input node for connection
   */
  getInput(): AudioNode {
    return this.compressor;
  }

  /**
   * Update compressor parameters
   */
  private updateParams(): void {
    this.compressor.threshold.value = this.threshold;
    this.compressor.ratio.value = this.ratio;
    this.compressor.attack.value = this.attack;
    this.compressor.release.value = this.release;
    this.compressor.knee.value = this.knee;
  }

  /**
   * Set threshold in dB
   */
  setThreshold(db: number): void {
    this.threshold = db;
    this.updateParams();
  }

  /**
   * Set compression ratio (e.g., 4 for 4:1)
   */
  setRatio(ratio: number): void {
    this.ratio = ratio;
    this.updateParams();
  }

  /**
   * Set attack time in seconds
   */
  setAttack(seconds: number): void {
    this.attack = seconds;
    this.updateParams();
  }

  /**
   * Set release time in seconds
   */
  setRelease(seconds: number): void {
    this.release = seconds;
    this.updateParams();
  }

  /**
   * Connect to destination
   */
  connect(destination: AudioNode): void {
    this.compressor.connect(destination);
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    this.compressor.disconnect();
  }
}
