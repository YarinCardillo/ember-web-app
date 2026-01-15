/**
 * InputNode - Wraps getUserMedia with gain control and analyser
 *
 * IMPORTANT: Disables browser audio processing (echo cancellation, noise suppression,
 * auto gain control) to preserve audio quality for music processing.
 */

import { dbToLinear } from "../../utils/dsp-math";

export class InputNode {
  private gainNode: GainNode;
  private analyserNodeL: AnalyserNode;
  private analyserNodeR: AnalyserNode;
  private channelSplitter: ChannelSplitterNode;
  private channelMerger: ChannelMergerNode;
  private inputMuteGain: GainNode; // For muting input when preview is playing
  private mediaStream: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext;
  private isMuted: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.analyserNodeL = ctx.createAnalyser();
    this.analyserNodeR = ctx.createAnalyser();
    this.channelSplitter = ctx.createChannelSplitter(2);
    this.channelMerger = ctx.createChannelMerger(2);
    this.inputMuteGain = ctx.createGain();

    // Configure analysers
    this.analyserNodeL.fftSize = 2048;
    this.analyserNodeL.smoothingTimeConstant = 0.8;
    this.analyserNodeR.fftSize = 2048;
    this.analyserNodeR.smoothingTimeConstant = 0.8;

    // Connect gain to splitter, then to separate analysers
    // gainNode → splitter → analyserL (channel 0)
    //                    → analyserR (channel 1)
    // Then merge back for output
    this.gainNode.connect(this.channelSplitter);
    this.channelSplitter.connect(this.analyserNodeL, 0); // Left channel
    this.channelSplitter.connect(this.analyserNodeR, 1); // Right channel

    // Merge analysers back to stereo output
    this.analyserNodeL.connect(this.channelMerger, 0, 0);
    this.analyserNodeR.connect(this.channelMerger, 0, 1);
  }

  /**
   * Get user media stream and connect to gain node
   * Disables all browser audio processing for clean audio
   * Uses device's native sample rate to avoid resampling artifacts
   */
  async setInput(deviceId?: string): Promise<void> {
    // Audio constraints that disable browser processing
    // These are critical for music/audio quality
    // Note: We intentionally don't specify sampleRate or channelCount
    // to use the device's native settings and avoid resampling
    const audioConstraints: MediaTrackConstraints = {
      // Disable echo cancellation (causes comb filtering)
      echoCancellation: false,
      // Disable noise suppression (causes audio artifacts)
      noiseSuppression: false,
      // Disable auto gain control (causes pumping/compression)
      autoGainControl: false,
    };

    // Add device ID if specified
    if (deviceId) {
      audioConstraints.deviceId = { exact: deviceId };
    }

    const constraints: MediaStreamConstraints = {
      audio: audioConstraints,
      video: false,
    };

    try {
      // Stop any existing stream
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }
      if (this.mediaStream) {
        this.mediaStream.disconnect();
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Log the actual track settings
      const track = this.stream.getAudioTracks()[0];
      if (track) {
        const settings = track.getSettings();
        console.log("Audio track settings:", {
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
        });
      }

      this.mediaStream = this.ctx.createMediaStreamSource(this.stream);
      // Don't connect here - let the signal chain handle connections

      console.log("Input stream created successfully");
    } catch (error) {
      console.error("Failed to get user media:", error);
      throw error;
    }
  }

  /**
   * Connect the raw media stream to a destination (e.g., vinyl mode)
   * This should be called FIRST in the signal chain
   * Uses inputMuteGain to allow muting input when preview is playing
   */
  connectRawSource(destination: AudioNode): void {
    if (this.mediaStream) {
      // mediaStream → inputMuteGain → destination
      this.mediaStream.connect(this.inputMuteGain);
      this.inputMuteGain.connect(destination);
    }
  }

  /**
   * Mute the input signal (for preview mode)
   */
  muteInput(): void {
    if (this.isMuted) return;
    this.isMuted = true;
    const now = this.ctx.currentTime;
    this.inputMuteGain.gain.cancelScheduledValues(now);
    this.inputMuteGain.gain.setValueAtTime(this.inputMuteGain.gain.value, now);
    this.inputMuteGain.gain.linearRampToValueAtTime(0, now + 0.05);
  }

  /**
   * Unmute the input signal (after preview stops)
   */
  unmuteInput(): void {
    if (!this.isMuted) return;
    this.isMuted = false;
    const now = this.ctx.currentTime;
    this.inputMuteGain.gain.cancelScheduledValues(now);
    this.inputMuteGain.gain.setValueAtTime(this.inputMuteGain.gain.value, now);
    this.inputMuteGain.gain.linearRampToValueAtTime(1, now + 0.05);
  }

  /**
   * Connect input to the gain stage from an upstream node
   * This allows vinyl mode to feed into the gain stage
   */
  connectToGainStage(source: AudioNode): void {
    source.connect(this.gainNode);
  }

  /**
   * Set input gain in dB
   * @param db - Gain in decibels (-36 to +36)
   */
  setGain(db: number): void {
    this.gainNode.gain.value = dbToLinear(db);
  }

  /**
   * Get analyser nodes for stereo metering
   * @returns Object with left and right AnalyserNodes
   */
  getAnalysers(): { left: AnalyserNode; right: AnalyserNode } {
    return { left: this.analyserNodeL, right: this.analyserNodeR };
  }

  /**
   * Get the gain input node for connections
   * This is where processed audio enters the gain stage
   * @returns GainNode for upstream connections
   */
  getGainInput(): AudioNode {
    return this.gainNode;
  }

  /**
   * Get output node for connection
   * @returns ChannelMergerNode as the output of the input stage (stereo)
   */
  getOutput(): AudioNode {
    return this.channelMerger;
  }

  /**
   * Connect to destination
   * @param destination - AudioNode to connect output to
   */
  connect(destination: AudioNode): void {
    this.channelMerger.connect(destination);
  }

  /**
   * Disconnect output from downstream nodes ONLY.
   * Use this for temporary signal chain rerouting.
   * Does NOT stop the MediaStream or disconnect the raw source.
   */
  disconnectOutput(): void {
    this.channelMerger.disconnect();
  }

  /**
   * Disconnect from destination - FULL CLEANUP
   * Use this only when shutting down the audio engine.
   * This stops the MediaStream tracks permanently.
   */
  disconnect(): void {
    this.channelMerger.disconnect();
    if (this.mediaStream) {
      this.mediaStream.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }
}
