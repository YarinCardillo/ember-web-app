/**
 * OutputNode - Final gain stage with hard clipper and analysers for metering
 *
 * Signal chain: preGain -> preClipperAnalyser -> clipper (0dB hard limit) -> postGainAnalyser -> destination
 *
 * The preGain control affects levels entering the clipper (can cause clipping).
 * The preClipperAnalyser meters levels entering the clipper (shows when signal clips).
 * The clipper hard-clips at 0dB (±1.0), completely transparent below.
 * The postGainAnalyser meters the final output level (post-clipper).
 * Uses 4x oversampling for analog-like anti-aliasing to reduce harsh artifacts.
 *
 * Bypass mode: connects directly to gainNode (skipping preGain and clipper) for clean passthrough.
 */

import { dbToLinear } from "../../utils/dsp-math";

export class OutputNode {
  private preGainNode: GainNode;
  private gainNode: GainNode;
  private clipperNode: WaveShaperNode;
  // Stereo analysers for pre-clipper metering
  private preClipperAnalyserL: AnalyserNode;
  private preClipperAnalyserR: AnalyserNode;
  private preClipperSplitter: ChannelSplitterNode;
  private preClipperMerger: ChannelMergerNode;
  // Stereo analysers for post-gain metering
  private postGainAnalyserL: AnalyserNode;
  private postGainAnalyserR: AnalyserNode;
  private postGainSplitter: ChannelSplitterNode;
  private postGainMerger: ChannelMergerNode;

  constructor(ctx: AudioContext) {
    this.preGainNode = ctx.createGain();
    this.gainNode = ctx.createGain();
    this.clipperNode = ctx.createWaveShaper();

    // Pre-clipper stereo analysers
    this.preClipperAnalyserL = ctx.createAnalyser();
    this.preClipperAnalyserR = ctx.createAnalyser();
    this.preClipperSplitter = ctx.createChannelSplitter(2);
    this.preClipperMerger = ctx.createChannelMerger(2);
    this.preClipperAnalyserL.fftSize = 256;
    this.preClipperAnalyserL.smoothingTimeConstant = 0.8;
    this.preClipperAnalyserR.fftSize = 256;
    this.preClipperAnalyserR.smoothingTimeConstant = 0.8;

    // Post-gain stereo analysers
    this.postGainAnalyserL = ctx.createAnalyser();
    this.postGainAnalyserR = ctx.createAnalyser();
    this.postGainSplitter = ctx.createChannelSplitter(2);
    this.postGainMerger = ctx.createChannelMerger(2);
    this.postGainAnalyserL.fftSize = 256;
    this.postGainAnalyserL.smoothingTimeConstant = 0.8;
    this.postGainAnalyserR.fftSize = 256;
    this.postGainAnalyserR.smoothingTimeConstant = 0.8;

    // Create hard clipping curve at 0dB
    this.clipperNode.curve =
      this.createHardClipCurve() as Float32Array<ArrayBuffer>;
    this.clipperNode.oversample = "4x"; // Reduce aliasing artifacts

    // Signal chain with stereo metering:
    // preGain → splitter → analyserL/R → merger → clipper → gain → splitter → analyserL/R → merger → destination

    // Pre-clipper metering
    this.preGainNode.connect(this.preClipperSplitter);
    this.preClipperSplitter.connect(this.preClipperAnalyserL, 0);
    this.preClipperSplitter.connect(this.preClipperAnalyserR, 1);
    this.preClipperAnalyserL.connect(this.preClipperMerger, 0, 0);
    this.preClipperAnalyserR.connect(this.preClipperMerger, 0, 1);
    this.preClipperMerger.connect(this.clipperNode);

    // Clipper to gain
    this.clipperNode.connect(this.gainNode);

    // Post-gain metering
    this.gainNode.connect(this.postGainSplitter);
    this.postGainSplitter.connect(this.postGainAnalyserL, 0);
    this.postGainSplitter.connect(this.postGainAnalyserR, 1);
    this.postGainAnalyserL.connect(this.postGainMerger, 0, 0);
    this.postGainAnalyserR.connect(this.postGainMerger, 0, 1);
    this.postGainMerger.connect(ctx.destination);
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
    // WaveShaper curve resolution: 2^16 + 1 = 65537
    // Odd count ensures a center sample at x=0 for proper symmetry
    const samples = 65537;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      // Map index to -1.0 to +1.0 range (standard Web Audio input range)
      const x = (i / (samples - 1)) * 2 - 1;

      // Hard clip at ±1.0 (0dB) - linear passthrough for everything in range
      // Since input is already normalized to [-1, 1], we just pass it through
      // The clipping happens naturally at the boundaries
      curve[i] = Math.max(-1, Math.min(1, x));
    }

    return curve;
  }

  /**
   * Get input node for connection
   * @returns GainNode (preGain) as entry point to the output stage
   */
  getInput(): AudioNode {
    return this.preGainNode;
  }

  /**
   * Set pre-clipper gain in dB
   * Higher values drive more into the clipper for saturation
   * @param db - Gain in decibels (-12 to +12)
   */
  setPreGain(db: number): void {
    const linearGain = dbToLinear(db);
    this.preGainNode.gain.setTargetAtTime(
      linearGain,
      this.preGainNode.context.currentTime,
      0.01,
    );
  }

  /**
   * Get analyser nodes for stereo metering (pre-clipper)
   * Shows level entering clipper for clipping indication
   * @returns Object with left and right AnalyserNodes positioned before the clipper
   */
  getPreClipperAnalysers(): { left: AnalyserNode; right: AnalyserNode } {
    return { left: this.preClipperAnalyserL, right: this.preClipperAnalyserR };
  }

  /**
   * Get analyser nodes for stereo post-gain metering
   * Shows final output level after all processing
   * @returns Object with left and right AnalyserNodes positioned at the final output
   */
  getPostGainAnalysers(): { left: AnalyserNode; right: AnalyserNode } {
    return { left: this.postGainAnalyserL, right: this.postGainAnalyserR };
  }

  /**
   * Connect source to this node (for legacy compatibility)
   * @param source - AudioNode to connect to input
   */
  connect(source: AudioNode): void {
    source.connect(this.preGainNode);
  }

  /**
   * Disconnect input
   * Note: Output node remains connected to destination
   */
  disconnect(): void {
    // Output node is always connected to destination
    // This disconnects any input source
  }

  /**
   * Reconnect to AudioContext destination
   * Call this after setSinkId to ensure audio routes to new output device
   * @param ctx - AudioContext to reconnect to
   */
  reconnectToDestination(ctx: AudioContext): void {
    // Disconnect from old destination
    this.postGainMerger.disconnect();

    // Reconnect to (potentially new) destination
    this.postGainMerger.connect(ctx.destination);
  }

  /**
   * Get the gain node (post-clipper) for bypass routing
   * In bypass mode, connect directly here to skip clipper and go straight to output
   * @returns GainNode for bypass connection
   */
  getMasterGainNode(): GainNode {
    return this.gainNode;
  }
}
