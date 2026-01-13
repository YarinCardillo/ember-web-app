/**
 * ToneStackNode - 4-band EQ using BiquadFilters
 * Bass/Sub (75Hz), Mid (800Hz), Treble (4kHz), Presence (11kHz)
 */

export class ToneStackNode {
  private bassFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private trebleFilter: BiquadFilterNode;
  private presenceFilter: BiquadFilterNode;
  private bypassed: boolean = false;
  private storedGains: {
    bass: number;
    mid: number;
    treble: number;
    presence: number;
  } = {
    bass: 0,
    mid: 0,
    treble: 0,
    presence: 0,
  };

  constructor(ctx: AudioContext) {
    // Bass/Sub - lowshelf at 75Hz
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = "lowshelf";
    this.bassFilter.frequency.value = 75;
    this.bassFilter.gain.value = 0;

    // Mid - peaking at 800Hz
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = "peaking";
    this.midFilter.frequency.value = 800;
    this.midFilter.Q.value = 1;
    this.midFilter.gain.value = 0;

    // Treble - peaking at 4kHz
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = "peaking";
    this.trebleFilter.frequency.value = 4000;
    this.trebleFilter.Q.value = 1;
    this.trebleFilter.gain.value = 0;

    // Presence - highshelf at 11kHz
    this.presenceFilter = ctx.createBiquadFilter();
    this.presenceFilter.type = "highshelf";
    this.presenceFilter.frequency.value = 11000;
    this.presenceFilter.gain.value = 0;

    // Connect chain: bass -> mid -> treble -> presence
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.presenceFilter);
  }

  /**
   * Get input node for connection
   * @returns BiquadFilterNode (bass filter) as entry point to the EQ chain
   */
  getInput(): AudioNode {
    return this.bassFilter;
  }

  /**
   * Set bypass state - when bypassed, all EQ bands are set to 0dB (flat)
   * @param bypassed - True to bypass EQ processing
   */
  setBypass(bypassed: boolean): void {
    this.bypassed = bypassed;
    const currentTime = this.bassFilter.context.currentTime;
    const timeConstant = 0.01;

    if (bypassed) {
      // Set all gains to 0 (flat response)
      this.bassFilter.gain.setTargetAtTime(0, currentTime, timeConstant);
      this.midFilter.gain.setTargetAtTime(0, currentTime, timeConstant);
      this.trebleFilter.gain.setTargetAtTime(0, currentTime, timeConstant);
      this.presenceFilter.gain.setTargetAtTime(0, currentTime, timeConstant);
    } else {
      // Restore stored gains
      this.bassFilter.gain.setTargetAtTime(
        this.storedGains.bass,
        currentTime,
        timeConstant,
      );
      this.midFilter.gain.setTargetAtTime(
        this.storedGains.mid,
        currentTime,
        timeConstant,
      );
      this.trebleFilter.gain.setTargetAtTime(
        this.storedGains.treble,
        currentTime,
        timeConstant,
      );
      this.presenceFilter.gain.setTargetAtTime(
        this.storedGains.presence,
        currentTime,
        timeConstant,
      );
    }
  }

  /**
   * Set bass gain in dB
   * @param db - Gain in decibels (-12 to +12)
   */
  setBass(db: number): void {
    this.storedGains.bass = db;
    if (!this.bypassed) {
      const currentTime = this.bassFilter.context.currentTime;
      this.bassFilter.gain.setTargetAtTime(db, currentTime, 0.01);
    }
  }

  /**
   * Set mid gain in dB
   * @param db - Gain in decibels (-12 to +12)
   */
  setMid(db: number): void {
    this.storedGains.mid = db;
    if (!this.bypassed) {
      const currentTime = this.midFilter.context.currentTime;
      this.midFilter.gain.setTargetAtTime(db, currentTime, 0.01);
    }
  }

  /**
   * Set treble gain in dB
   * @param db - Gain in decibels (-12 to +12)
   */
  setTreble(db: number): void {
    this.storedGains.treble = db;
    if (!this.bypassed) {
      const currentTime = this.trebleFilter.context.currentTime;
      this.trebleFilter.gain.setTargetAtTime(db, currentTime, 0.01);
    }
  }

  /**
   * Set presence gain in dB
   * @param db - Gain in decibels (-12 to +12)
   */
  setPresence(db: number): void {
    this.storedGains.presence = db;
    if (!this.bypassed) {
      const currentTime = this.presenceFilter.context.currentTime;
      this.presenceFilter.gain.setTargetAtTime(db, currentTime, 0.01);
    }
  }

  /**
   * Connect to destination
   * @param destination - AudioNode to connect output to
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
