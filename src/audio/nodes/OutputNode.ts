/**
 * OutputNode - Final gain stage with hard clipper and analysers for metering
 * 
 * Signal chain: preGain -> preClipperAnalyser -> clipper (0dB hard limit) -> gain (master volume) -> postGainAnalyser -> destination
 * 
 * The preGain control affects levels entering the clipper (can cause clipping).
 * The preClipperAnalyser meters levels entering the clipper (shows when signal clips).
 * The clipper hard-clips at 0dB (±1.0), completely transparent below.
 * The gain control (master) is post-clipper, so it only affects volume to speakers (cannot cause clipping).
 * The postGainAnalyser meters the final output level (post-clipper, post-gain).
 * Uses 4x oversampling for analog-like anti-aliasing to reduce harsh artifacts.
 */

import { dbToLinear } from '../../utils/dsp-math';

export class OutputNode {
  private preGainNode: GainNode;
  private gainNode: GainNode;
  private clipperNode: WaveShaperNode;
  private preClipperAnalyser: AnalyserNode;
  private postGainAnalyser: AnalyserNode;

  constructor(ctx: AudioContext) {
    this.preGainNode = ctx.createGain();
    this.gainNode = ctx.createGain();
    this.clipperNode = ctx.createWaveShaper();
    this.preClipperAnalyser = ctx.createAnalyser();
    this.preClipperAnalyser.fftSize = 256; // Smaller for LED meter
    this.preClipperAnalyser.smoothingTimeConstant = 0.8;

    this.postGainAnalyser = ctx.createAnalyser();
    this.postGainAnalyser.fftSize = 256; // Smaller for LED meter
    this.postGainAnalyser.smoothingTimeConstant = 0.8;

    // Create hard clipping curve at 0dB
    this.clipperNode.curve = this.createHardClipCurve() as Float32Array<ArrayBuffer>;
    this.clipperNode.oversample = '4x'; // Reduce aliasing artifacts

    // Signal chain: preGain -> preClipperAnalyser -> clipper -> gain -> postGainAnalyser -> destination
    this.preGainNode.connect(this.preClipperAnalyser);
    this.preClipperAnalyser.connect(this.clipperNode);
    this.clipperNode.connect(this.gainNode);
    this.gainNode.connect(this.postGainAnalyser);
    this.postGainAnalyser.connect(ctx.destination);
  }

  /**
   * Create a hard clipping curve at 0dB (±1.0)
   * Completely transparent below 0dB, hard clips above
   * Uses 4x oversampling (set on WaveShaperNode) for analog-like anti-aliasing
   * 
   * IMPORTANT: Web Audio WaveShaperNode expects curve indexed for input range [-1, +1]
   * curve[0] = output for input -1, curve[length-1] = output for input +1
   */
  private createHardClipCurve(): Float32Array {
    const samples = 65537; // Odd number for symmetry, high resolution
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      // Map index to -1.0 to +1.0 range (standard Web Audio input range)
      const x = (i / (samples - 1)) * 2 - 1;
      
      // Hard clip at ±1.0 (0dB) - linear passthrough for everything in range
      // Since input is already normalized to [-1, 1], we just pass it through
      // The clipping happens naturally at the boundaries
      curve[i] = x;
    }
    
    return curve;
  }

  /**
   * Get input node for connection
   * Returns preGain node (entry point)
   */
  getInput(): AudioNode {
    return this.preGainNode;
  }

  /**
   * Set pre-clipper gain in dB
   */
  setPreGain(db: number): void {
    const linearGain = dbToLinear(db);
    this.preGainNode.gain.setTargetAtTime(linearGain, this.preGainNode.context.currentTime, 0.01);
  }

  /**
   * Set output gain (master volume) in dB
   */
  setGain(db: number): void {
    this.gainNode.gain.setTargetAtTime(dbToLinear(db), this.gainNode.context.currentTime, 0.01);
  }

  /**
   * Get analyser node for metering (pre-clipper, shows level entering clipper)
   */
  getPreClipperAnalyser(): AnalyserNode {
    return this.preClipperAnalyser;
  }

  /**
   * Get analyser node for post-gain metering (final output level)
   */
  getPostGainAnalyser(): AnalyserNode {
    return this.postGainAnalyser;
  }

  /**
   * Connect source to this node (for legacy compatibility)
   */
  connect(source: AudioNode): void {
    source.connect(this.preGainNode);
  }

  /**
   * Disconnect input
   */
  disconnect(): void {
    // Output node is always connected to destination
    // This disconnects any input source
  }

  /**
   * Reconnect to AudioContext destination
   * Call this after setSinkId to ensure audio routes to new output device
   * This is needed because changing sinkId may not automatically re-route existing connections in some contexts (e.g., PWA)
   */
  reconnectToDestination(ctx: AudioContext): void {
    // Disconnect from old destination
    this.postGainAnalyser.disconnect();
    
    // Reconnect to (potentially new) destination
    this.postGainAnalyser.connect(ctx.destination);
  }

  /**
   * Get the master gain node (post-clipper) for bypass routing
   * In bypass mode, connect directly here to skip all processing but keep master volume control
   */
  getMasterGainNode(): GainNode {
    return this.gainNode;
  }
}
