/**
 * AudioEngine - Singleton managing AudioContext and signal chain
 */

// Extend AudioContext type for setSinkId (not in all TypeScript definitions yet)
interface AudioContextWithSinkId extends AudioContext {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
}

class AudioEngine {
  private static instance: AudioEngine | null = null;
  private ctx: AudioContextWithSinkId | null = null;
  private isInitialized: boolean = false;
  private workletsLoaded: boolean = false;
  private hasPermission: boolean = false;
  private keepAliveOscillator: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.ctx) {
      return;
    }

    // Create AudioContext
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof globalThis.AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass() as AudioContextWithSinkId;

    // Resume if suspended
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Load AudioWorklet modules
    if (!this.workletsLoaded) {
      try {
        await Promise.all([
          this.ctx.audioWorklet.addModule('/worklets/tube-saturation.worklet.js'),
          this.ctx.audioWorklet.addModule('/worklets/tape-wobble.worklet.js')
        ]);
        this.workletsLoaded = true;
      } catch (error) {
        console.error('Failed to load AudioWorklet:', error);
        // Continue without worklet - will use fallback
      }
    }

    this.isInitialized = true;
  }

  /**
   * Request microphone permission (needed before device enumeration shows labels)
   */
  async requestPermission(): Promise<boolean> {
    if (this.hasPermission) {
      return true;
    }

    try {
      // Request permission with minimal constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      // Immediately stop the stream - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      this.hasPermission = true;
      console.log('Audio permission granted');
      return true;
    } catch (error) {
      console.error('Failed to get audio permission:', error);
      return false;
    }
  }

  /**
   * Get the AudioContext instance
   */
  getContext(): globalThis.AudioContext {
    if (!this.ctx) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }
    return this.ctx;
  }

  /**
   * Check if AudioEngine is initialized
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if we have audio permission
   */
  getHasPermission(): boolean {
    return this.hasPermission;
  }

  /**
   * Resume AudioContext if suspended
   */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Enumerate audio input devices
   * Note: Device labels may be empty until permission is granted
   */
  async enumerateInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to enumerate input devices:', error);
      return [];
    }
  }

  /**
   * Enumerate audio output devices
   * Note: Device labels may be empty until permission is granted
   */
  async enumerateOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audiooutput');
    } catch (error) {
      console.error('Failed to enumerate output devices:', error);
      return [];
    }
  }

  /**
   * Enumerate all audio devices (legacy method, kept for compatibility)
   */
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return this.enumerateInputDevices();
  }

  /**
   * Set output device (if browser supports it)
   * Note: Safari and Firefox do not support setSinkId
   */
  async setOutputDevice(deviceId: string): Promise<boolean> {
    if (!this.ctx) {
      console.error('AudioContext not initialized');
      return false;
    }

    if (typeof this.ctx.setSinkId === 'function') {
      try {
        await this.ctx.setSinkId(deviceId);
        console.log('Output device set to:', deviceId);
        return true;
      } catch (error) {
        console.error('Failed to set output device:', error);
        return false;
      }
    } else {
      console.warn('setSinkId not supported in this browser (Safari/Firefox)');
      return false;
    }
  }

  /**
   * Check if output device selection is supported
   * Chrome 110+, Edge 110+ only
   */
  isOutputDeviceSupported(): boolean {
    // Check if AudioContext has setSinkId
    // Note: We need to check on an actual AudioContext instance
    if (this.ctx && typeof this.ctx.setSinkId === 'function') {
      return true;
    }
    
    // Fallback: check if the API exists on the prototype
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof globalThis.AudioContext }).webkitAudioContext;
      return 'setSinkId' in AudioContextClass.prototype;
    } catch {
      return false;
    }
  }

  /**
   * Start silent oscillator to keep audio context active (prevents background throttling)
   */
  startKeepAlive(): void {
    if (!this.ctx || this.keepAliveOscillator) return;
    
    // Create silent oscillator (inaudible, keeps audio context active)
    this.keepAliveOscillator = this.ctx.createOscillator();
    this.keepAliveGain = this.ctx.createGain();
    this.keepAliveGain.gain.value = 0; // Silent
    
    this.keepAliveOscillator.connect(this.keepAliveGain);
    this.keepAliveGain.connect(this.ctx.destination);
    this.keepAliveOscillator.start();
    
    console.log('Audio keep-alive started');
  }

  /**
   * Stop the keep-alive oscillator
   */
  stopKeepAlive(): void {
    const wasActive = this.keepAliveOscillator !== null || this.keepAliveGain !== null;
    
    if (this.keepAliveOscillator) {
      this.keepAliveOscillator.stop();
      this.keepAliveOscillator.disconnect();
      this.keepAliveOscillator = null;
    }
    if (this.keepAliveGain) {
      this.keepAliveGain.disconnect();
      this.keepAliveGain = null;
    }
    
    if (wasActive) {
      console.log('Audio keep-alive stopped');
    }
  }

  /**
   * Cleanup and dispose of AudioContext
   */
  dispose(): void {
    this.stopKeepAlive();
    
    if (this.ctx) {
      this.ctx.close().catch(console.error);
      this.ctx = null;
    }
    this.isInitialized = false;
    this.workletsLoaded = false;
  }
}

export default AudioEngine;
