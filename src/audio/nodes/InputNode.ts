/**
 * InputNode - Wraps getUserMedia with gain control and analyser
 *
 * IMPORTANT: Disables browser audio processing (echo cancellation, noise suppression,
 * auto gain control) to preserve audio quality for music processing.
 */

import { dbToLinear } from "../../utils/dsp-math";

export class InputNode {
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  private inputMuteGain: GainNode; // For muting input when preview is playing
  private mediaStream: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext;
  private isMuted: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.analyserNode = ctx.createAnalyser();
    this.inputMuteGain = ctx.createGain();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect gain to analyser
    this.gainNode.connect(this.analyserNode);
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
   * Get analyser node for metering
   * @returns AnalyserNode configured for FFT analysis
   */
  getAnalyser(): AnalyserNode {
    return this.analyserNode;
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
   * @returns AnalyserNode as the output of the input stage
   */
  getOutput(): AudioNode {
    return this.analyserNode;
  }

  /**
   * Connect to destination
   * @param destination - AudioNode to connect output to
   */
  connect(destination: AudioNode): void {
    this.analyserNode.connect(destination);
  }

  /**
   * Disconnect output from downstream nodes ONLY.
   * Use this for temporary signal chain rerouting.
   * Does NOT stop the MediaStream or disconnect the raw source.
   */
  disconnectOutput(): void {
    this.analyserNode.disconnect();
  }

  /**
   * Disconnect from destination - FULL CLEANUP
   * Use this only when shutting down the audio engine.
   * This stops the MediaStream tracks permanently.
   */
  disconnect(): void {
    this.analyserNode.disconnect();
    if (this.mediaStream) {
      this.mediaStream.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }
}
