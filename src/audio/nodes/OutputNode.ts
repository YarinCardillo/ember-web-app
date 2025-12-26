/**
 * OutputNode - Final gain stage with hard clipper and analyser for metering
 * 
 * The clipper hard-clips at 0dB (±1.0), completely transparent below.
 * Uses 4x oversampling for analog-like anti-aliasing to reduce harsh artifacts.
 */

import { dbToLinear } from '../../utils/dsp-math';

export class OutputNode {
  private gainNode: GainNode;
  private clipperNode: WaveShaperNode;
  private analyserNode: AnalyserNode;

  constructor(ctx: AudioContext) {
    this.gainNode = ctx.createGain();
    this.clipperNode = ctx.createWaveShaper();
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Create hard clipping curve at 0dB
    this.clipperNode.curve = this.createHardClipCurve() as Float32Array<ArrayBuffer>;
    this.clipperNode.oversample = '4x'; // Reduce aliasing artifacts

    // Signal chain: gain -> clipper -> analyser -> destination
    this.gainNode.connect(this.clipperNode);
    this.clipperNode.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);
  }

  /**
   * Create a hard clipping curve at 0dB (±1.0)
   * Completely transparent below 0dB, hard clips above
   * Uses 4x oversampling (set on WaveShaperNode) for analog-like anti-aliasing
   */
  private createHardClipCurve(): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      // Map index to -2.0 to +2.0 range (allow headroom for hot signals)
      const x = (i / (samples - 1)) * 4 - 2;
      
      // Hard clip at ±1.0 (0dB)
      // Linear below threshold, clamped above
      if (x > 1.0) {
        curve[i] = 1.0;
      } else if (x < -1.0) {
        curve[i] = -1.0;
      } else {
        curve[i] = x;
      }
    }
    
    return curve;
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
