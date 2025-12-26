/**
 * PreampNode - Gain staging with soft clip protection
 */

import { dbToLinear } from '../../utils/dsp-math';

export class PreampNode {
  private gainNode: GainNode;
  private waveShaperNode: WaveShaperNode;

  constructor(ctx: AudioContext) {
    this.gainNode = ctx.createGain();
    this.waveShaperNode = ctx.createWaveShaper();

    // Soft clipping curve for protection
    const curve = new Float32Array(65537);
    for (let i = 0; i < 65537; i++) {
      const x = (i - 32768) / 32768;
      // Soft clipping using tanh
      curve[i] = Math.tanh(x * 0.8) * 0.8;
    }
    this.waveShaperNode.curve = curve;
    this.waveShaperNode.oversample = '4x';

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
