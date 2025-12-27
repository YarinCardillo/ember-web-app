/**
 * PreampNode - Gain staging with soft clip protection. Currently unused in the signal chain.
 */

import { dbToLinear } from '../../utils/dsp-math';

export class PreampNode {
  private gainNode: GainNode;
  private waveShaperNode: WaveShaperNode;

  constructor(ctx: AudioContext) {
    this.gainNode = ctx.createGain();
    this.waveShaperNode = ctx.createWaveShaper();

    // Linear passthrough curve (no clipping in preamp - clipping handled by OutputNode)
    // Using WaveShaper with linear curve allows future soft-clip option if needed
    const curve = new Float32Array(65537);
    for (let i = 0; i < 65537; i++) {
      const x = (i - 32768) / 32768;
      // Linear passthrough: output = input
      curve[i] = x;
    }
    this.waveShaperNode.curve = curve;
    this.waveShaperNode.oversample = 'none'; // No oversampling needed for linear
    
    // Connect gain to waveshaper
    this.gainNode.connect(this.waveShaperNode);
  }

  /**
   * Get input node for connection
   */
  getInput(): AudioNode {
    return this.gainNode;
  }

  /**
   * Set preamp gain in dB
   */
  setGain(db: number): void {
    this.gainNode.gain.value = dbToLinear(db);
  }

  /**
   * Connect to destination
   */
  connect(destination: AudioNode): void {
    this.waveShaperNode.connect(destination);
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    this.waveShaperNode.disconnect();
  }
}
