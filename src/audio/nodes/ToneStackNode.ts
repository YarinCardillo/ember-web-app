/**
 * ToneStackNode - 4-band EQ using BiquadFilters
 * Bass (100Hz), Mid (1kHz), Treble (4kHz), Presence (8kHz)
 */

export class ToneStackNode {
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  private presenceFilter: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    // Bass - lowshelf at 100Hz
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 100;
    this.bassFilter.gain.value = 0;

    // Mid - peaking at 1kHz
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1;
    this.midFilter.gain.value = 0;

    // Treble - peaking at 4kHz
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'peaking';
    this.trebleFilter.frequency.value = 4000;
    this.trebleFilter.Q.value = 1;
    this.trebleFilter.gain.value = 0;

    // Presence - highshelf at 8kHz
    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 8000;
    this.presenceFilter.gain.value = 0;

    // Connect chain: bass -> mid -> treble -> presence
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);
  }

  /**
   * Get input node for connection
   */
  getInput(): AudioNode {
    return this.bassFilter;
  }

  /**
   * Set bass gain in dB (-12 to +12)
   */
  setBass(db: number): void {
    this.bassFilter.gain.value = db;
  }

  /**
   * Set mid gain in dB (-12 to +12)
   */
  setMid(db: number): void {
    this.midFilter.gain.value = db;
  }

  /**
   * Set treble gain in dB (-12 to +12)
   */
  setTreble(db: number): void {
    this.trebleFilter.gain.value = db;
  }

  /**
   * Set presence gain in dB (-12 to +12)
   */
  setPresence(db: number): void {
    this.presenceFilter.gain.value = db;
  }

  /**
   * Connect to destination
   */
  connect(destination: AudioNode): void {
    this.presenceFilter.connect(destination);
  }

  /**
   * Disconnect from destination
   */
  disconnect(): void {
    this.presenceFilter.disconnect();
  }
}
