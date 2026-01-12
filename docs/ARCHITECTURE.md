# Ember Amp Web - Architecture Documentation

This document provides detailed technical documentation of the Ember Amp Web architecture.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Audio Engine](#audio-engine)
3. [DSP Modules](#dsp-modules)
4. [State Management](#state-management)
5. [UI Components](#ui-components)
6. [Data Flow](#data-flow)
7. [Performance Considerations](#performance-considerations)

---

## System Overview

Ember Amp Web is a client-side audio processing application built entirely with web technologies. The architecture follows a unidirectional data flow pattern with clear separation between:

- **Audio Engine** - Manages Web Audio API lifecycle and signal routing
- **DSP Nodes** - Individual audio processing modules
- **State Store** - Centralized parameter management (Zustand)
- **UI Components** - React components for user interaction

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              Browser                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         React App                             │  │
│  │  ┌───────────── ┐    ┌─────────────┐    ┌─────────────────┐   │  │
│  │  │ UI Components│───▶│Zustand Store│───▶│  Audio Engine   │   │  │
│  │  │ (Knobs, VU)  │    │ (Parameters)│    │  (Singleton)    │   │  │
│  │  └───────────── ┘    └─────────────┘    └────────┬────────┘   │  │
│  │                                                  │            │  │
│  │  ┌───────────────────────────────────────────────▼──────────┐ │  │
│  │  │                      Web Audio API                       │ │  │
│  │  │ ┌──────┐ ┌─────┐ ┌────┐ ┌─────┐ ┌────┐ ┌─────┐ ┌─────┐   │ │  │
│  │  │ │ 33   │→│Input│→│Tape│→│ EQ  │→│Tube│→│Trans│→│Clip │→Out │  │
│  │  │ │Vinyl │ └─────┘ └────┘ └─────┘ └────┘ └─────┘ └─────┘   │ │  │
│  │  │ └──────┘                                                 │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Audio Engine

### AudioEngine Singleton

The `AudioEngine` class is a singleton responsible for:

- Managing the `AudioContext` lifecycle
- Loading AudioWorklet modules
- Enumerating audio input/output devices
- Setting output device via `setSinkId` (Chrome/Edge only)
- Providing the context to DSP nodes

```typescript
// src/audio/AudioEngine.ts

class AudioEngine {
  private static instance: AudioEngine | null = null;
  private ctx: AudioContext | null = null;
  
  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }
  
  async initialize(): Promise<void> {
    // Create AudioContext (must be after user interaction)
    this.ctx = new AudioContext();
    
    // Resume if suspended
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    // Load AudioWorklet modules
    await Promise.all([
      this.ctx.audioWorklet.addModule('/worklets/tube-saturation.worklet.js'),
      this.ctx.audioWorklet.addModule('/worklets/tape-wobble.worklet.js'),
      this.ctx.audioWorklet.addModule('/worklets/transient.worklet.js')
    ]);
  }
  
  async setOutputDevice(deviceId: string): Promise<boolean> {
    // Uses AudioContext.setSinkId (Chrome 110+, Edge 110+)
    if (typeof this.ctx.setSinkId === 'function') {
      await this.ctx.setSinkId(deviceId);
      return true;
    }
    return false;
  }
}
```

### Key Design Decisions

1. **Singleton Pattern** - Only one AudioContext should exist per application
2. **Lazy Initialization** - Context created only after user interaction (browser policy)
3. **Worklet Preloading** - All worklets loaded during initialization
4. **Output Device Support** - Uses `setSinkId` for output routing (with fallback)

### Keep-Alive Oscillator

Browsers aggressively throttle or suspend `AudioContext` when tabs are in the background to save battery. This can cause audio dropouts or complete silence when users switch to other apps while listening.

**Solution:** A silent oscillator runs continuously while the audio engine is active, keeping the `AudioContext` alive.

```typescript
// src/audio/AudioEngine.ts

startKeepAlive(): void {
  if (!this.ctx || this.keepAliveOscillator) return;
  
  // Create silent oscillator (inaudible, keeps audio context active)
  this.keepAliveOscillator = this.ctx.createOscillator();
  this.keepAliveGain = this.ctx.createGain();
  this.keepAliveGain.gain.value = 0; // Silent - no audible output
  
  this.keepAliveOscillator.connect(this.keepAliveGain);
  this.keepAliveGain.connect(this.ctx.destination);
  this.keepAliveOscillator.start();
}

stopKeepAlive(): void {
  if (this.keepAliveOscillator) {
    this.keepAliveOscillator.stop();
    this.keepAliveOscillator.disconnect();
    this.keepAliveOscillator = null;
  }
  // ... cleanup gain node
}
```

**How It Works:**
- Oscillator output is routed through a `GainNode` with `gain.value = 0` (completely silent)
- The oscillator maintains continuous audio processing, preventing browser throttling
- Started when the amp is powered on, stopped when powered off
- Runs continuously regardless of tab visibility to ensure uninterrupted background playback

**Why Not Stop in Background:**
- Users may want to listen to music while using other apps
- Stopping the keep-alive when the tab is hidden would defeat its purpose
- Audio processing must continue uninterrupted for background playback

---

## DSP Modules

Each DSP module is a class that wraps one or more Web Audio nodes and provides a clean API.

### Node Interface Pattern

```typescript
interface AudioNodeWrapper {
  connect(destination: AudioNode): void;
  disconnect(): void;
  getInput(): AudioNode;
  getOutput(): AudioNode;
  // Parameter setters...
}
```

### VinylModeNode

Vinyl record simulation processor that runs FIRST in the signal chain, before input gain.

**Signal Chain Inside VinylModeNode:**
```
Input → Buffer (0.733x speed) → [Dry] ─────────────→ Mixer → Boost (+8dB) → Output
                               → [Convolver] → Wet ──↗
Bypass path: Input → Bypass → Output
```

**Web Audio Nodes Used:**
- `AudioWorkletNode` - Variable playback rate buffer (vinyl-buffer-processor)
- `ConvolverNode` - Synthetic short reverb (0.8s decay)
- `GainNode` - Wet/dry mix, bypass, boost (+8dB)

**Features:**
- Variable playback rate (0.733x for 33/45 ratio)
- Synthetic reverb (75% wet when active)
- +8dB gain compensation (ramps with reverb)
- Smooth crossfade between bypass and active paths
- 4-minute timed mode with countdown timer

**Design Rationale:**
- Processes audio FIRST before input gain for cleanest signal
- Synthetic reverb avoids loading external IR files
- Gain boost compensates for reverb volume loss

### InputNode

Captures audio from the user's selected input device. Receives processed audio from VinylModeNode.

**Web Audio Nodes Used:**
- `MediaStreamAudioSourceNode` - Captures getUserMedia stream (raw source)
- `GainNode` - Input mute control (for preview mode)
- `GainNode` - Input level control (receives from VinylModeNode)
- `AnalyserNode` - Level metering

**Key Methods:**
- `connectRawSource(destination)` - Connects raw MediaStream to VinylModeNode
- `getGainInput()` - Returns gain node input for VinylModeNode connection
- `getOutput()` - Returns analyser node output for signal chain
- `muteInput()` / `unmuteInput()` - Mutes mic input when preview is playing

```typescript
class InputNode {
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  private mediaStream: MediaStreamAudioSourceNode | null;
  
  async setInput(deviceId?: string): Promise<void> {
    // Creates MediaStream but doesn't auto-connect
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    this.mediaStream = ctx.createMediaStreamSource(stream);
    // Connection handled separately: MediaStream → VinylMode → Input Gain
  }
  
  connectRawSource(destination: AudioNode): void {
    // Connect raw MediaStream to VinylModeNode (first in chain)
    if (this.mediaStream) {
      this.mediaStream.connect(destination);
    }
  }
  
  getGainInput(): AudioNode {
    return this.gainNode; // VinylModeNode connects here
  }
  
  setGain(db: number): void {
    this.gainNode.gain.value = dbToLinear(db);
  }
}
```

### TapeSimNode

Analog tape simulation with wow/flutter pitch modulation, head bump EQ, high-frequency rolloff, and odd harmonic saturation.

**Signal Chain Inside TapeSimNode:**
```
Input → HeadBumpFilter → HFRolloffFilter → WowFlutterWorklet → OddHarmonicSaturator → Output
           (peaking)        (lowpass)        (pitch mod)          (3rd,5th,7th)
```

**Web Audio Nodes Used:**
- `BiquadFilterNode` (peaking) - Head bump at 80Hz, +2dB
- `BiquadFilterNode` (lowpass) - HF rolloff at 15kHz
- `AudioWorkletNode` - tape-wobble processor
- `WaveShaperNode` - Odd harmonic saturation (3rd, 5th, 7th harmonics with 1/n³ decay)

**AudioWorklet Features (tape-wobble.worklet.js):**
- **Wow LFO**: ~0.5Hz, ±4 cents pitch modulation (slow tape speed variation)
- **Flutter LFO**: ~7Hz, ±1.5 cents (faster mechanical vibration)
- **Drift LFO**: ~0.1Hz, ±1 cent (slow organic drift)
- **Stereo Delay LFO**: ~0.1Hz, ±3 samples inter-channel delay variation (creates stereo width)

**Odd Harmonic Saturation:**
- Adds 3rd, 5th, 7th harmonics with 1/n³ decay law
- Coefficients: 3rd = 1/27, 5th = 1/125, 7th = 1/343
- Always active at 100% intensity (no user control)
- Creates symmetric "tape" distortion characteristic
- Applied via WaveShaperNode with 4x oversampling

**Fixed Parameters (no user controls):**
- All tape characteristics are fixed for authentic analog feel
- Toggle via TapeButton in InputStage (on/off only)

---

### ToneStackNode

4-band EQ inspired by Baxandall/Fender tone controls.

**Frequency Bands:**

| Band     | Type       | Frequency | Range  |
|----------|------------|-----------|--------|
| Bass     | Low Shelf  | 75 Hz     | ±12 dB |
| Mid      | Peaking    | 800 Hz    | ±12 dB |
| Treble   | Peaking    | 4 kHz     | ±12 dB |
| Presence | High Shelf | 11 kHz    | ±12 dB |

**Web Audio Nodes Used:**
- 4x `BiquadFilterNode` connected in series

### TubeSaturationNode

Custom DSP processing via AudioWorklet for tube-style harmonic distortion.

**AudioWorklet Parameters:**
- `drive` (0-1) - Saturation amount
- `harmonics` (0-1) - Even harmonic generation intensity
- `mix` (0-1) - Dry/wet blend

**Algorithm:**

```javascript
// Soft clipping
const saturate = (sample, drive) => {
  const k = 2 * drive / (1 - drive + 0.001);
  return Math.tanh(k * sample) / Math.tanh(k);
};

// Even harmonics (2nd, 4th, 6th) with 1/n² decay
const addEvenHarmonics = (x, amount) => {
  const harmonics = [2, 4, 6];
  let result = x;
  for (const n of harmonics) {
    const coeff = 1.0 / (n * n); // 1/n² decay
    result += amount * coeff * x * Math.pow(Math.abs(x), n - 1);
  }
  return result;
};
```

**Harmonic Coefficients:**
- 2nd harmonic: 1/4 = 0.25
- 4th harmonic: 1/16 = 0.0625
- 6th harmonic: 1/36 = 0.0278

Creates asymmetric "warm" distortion typical of tube amplifiers.

### TransientNode

SPL Transient Designer-style transient shaper using **sidechain filtering** for bass-focused transient detection while processing the fullband signal.

**Signal Chain Inside TransientNode:**
```
Audio Path (fullband, untouched):
  inputGain → workletNode → bypassGain

Sidechain Path (inside worklet, for detection only):
  drySample → LP 150Hz (copy) → Envelope Detection → Gain Modulation → Applied to original fullband signal
```

**Web Audio Nodes Used:**
- `AudioWorkletNode` - transient processor with internal sidechain filtering
- `GainNode` - Bypass routing

**AudioWorklet Features (transient.worklet.js):**
- **Sidechain Lowpass**: One-pole filter at 150Hz (default, adjustable 100-300Hz) applied to COPY of input for detection
- **Fast Envelope**: Attack ~0.1ms, release ~5ms (catches transients)
- **Slow Envelope**: Attack ~10ms, release ~100ms (follows body/sustain)
- **Transient Detection**: Ratio = fastEnvelope / slowEnvelope (computed from filtered sidechain signal)
  - When ratio > 1: attack phase (transient)
  - When ratio ≈ 1: sustain phase (body)
- **Gain Modulation**: Separate gain adjustment for attack and sustain portions
- **Gain Smoothing**: ~5ms smoothing to avoid clicks
- **Fullband Processing**: Gain modulation applied to ORIGINAL unfiltered signal

**Fixed Parameters (no user controls):**
- Attack: 75% (boost transients, optimized)
- Sustain: 0% (neutral, optimized)
- Mix: 55% (dry/wet blend, optimized)
- Sidechain frequency: 150Hz (default, adjustable 100-300Hz)
- Always active (no bypass control)

**Design Rationale:**
- **Zero phase issues**: No crossover filters in audio path - signal passes through unchanged except for gain modulation
- **Bass-focused detection**: Sidechain filtering focuses envelope detection on low frequencies (< 150Hz) where transients matter most
- **Fullband preservation**: Gain modulation applied to fullband signal preserves all frequencies
- **CPU efficient**: Single one-pole filter in worklet (no 4x BiquadFilter crossover)
- **Invisible to user**: No UI controls - always active in signal chain with optimized parameters

### SpeakerSimNode

Cabinet simulation using convolution. **Note: This node exists in the codebase but is not currently used in the signal chain. It may be implemented in future versions.**

**Web Audio Nodes Used:**
- `ConvolverNode` - Loads impulse response files

```typescript
async loadImpulseResponse(url: string): Promise<void> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
  this.convolver.buffer = audioBuffer;
}
```

**Current Status:**
- Node is created and connected in the signal chain
- Always bypassed (no IR loaded)
- No UI controls available
- Reserved for future implementation

### OutputNode

Final output stage with pre-clipper gain control, pre-clipper metering, hard clipper, master volume, and post-gain metering.

**Signal Chain Inside OutputNode:**
```
Input → PreGainNode → PreClipperAnalyser → ClipperNode → GainNode (Master) → PostGainAnalyser → destination
```

**Web Audio Nodes Used:**
- `GainNode` (preGain) - Pre-clipper gain control (-36 to +36 dB, 0.1 dB steps)
- `AnalyserNode` (preClipperAnalyser) - "Clipper" meter, shows level entering clipper (peak mode)
- `WaveShaperNode` - Hard clipper (0dB ceiling with 4x oversampling)
- `GainNode` (master) - Master volume control (-96 to +6 dB, 0 dB visually centered, non-linear)
- `AnalyserNode` (postGainAnalyser) - "DAC out" LED meter, shows final output level (peak mode)

**Design Rationale:**
- The preGain control affects levels *before* the clipper, allowing users to drive the clipper for distortion
- The "Clipper" meter (preClipperAnalyser) shows peak levels entering the clipper, warning when clipping occurs
- The hard clipper limits signal to 0dB (±1.0), completely transparent below threshold
- The Master gain is *after* the clipper, allowing users to attenuate or boost the clipped signal without causing additional clipping
- The "DAC out" meter (postGainAnalyser) shows the final output level after Master gain, warning if DAC clipping may occur

**Hard Clipper Implementation:**

```typescript
// Create hard clipping curve at 0dB
// IMPORTANT: WaveShaperNode expects curve mapped to input range [-1, +1]
private createHardClipCurve(): Float32Array {
  const samples = 65537;
  const curve = new Float32Array(samples);
  
  for (let i = 0; i < samples; i++) {
    // Map index to -1.0 to +1.0 range (standard Web Audio input range)
    const x = (i / (samples - 1)) * 2 - 1;
    // Linear passthrough (clipping happens at boundaries)
    curve[i] = x;
  }
  
  return curve;
}
this.clipperNode.curve = curve;
this.clipperNode.oversample = '4x'; // Reduces aliasing
```

**Pre-Clipper Gain:**

```typescript
setPreGain(db: number): void {
  // Pre-clipper gain affects level entering clipper
  // Range: -36 to +36 dB, 0.1 dB steps
  this.preGainNode.gain.setTargetAtTime(dbToLinear(db), this.ctx.currentTime, 0.01);
}
```

**Master Gain Post-Clipper:**

```typescript
setGain(db: number): void {
  // Master gain applied AFTER clipping
  // Range: -96 to +6 dB, 0 dB visually centered (non-linear slider)
  this.gainNode.gain.setTargetAtTime(dbToLinear(db), this.ctx.currentTime, 0.01);
}
```

---

## State Management

### Zustand Store

All audio parameters are managed in a centralized Zustand store with localStorage persistence.

```typescript
interface AudioState {
  // Status
  isInitialized: boolean;
  isRunning: boolean;
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  
  // Parameters (in dB where applicable)
  inputGain: number;       // -36 to +36 dB
  bass: number;            // ±12 dB
  mid: number;             // ±12 dB
  treble: number;          // ±12 dB
  presence: number;        // ±12 dB
  drive: number;           // 0-1
  harmonics: number;       // 0-1
  saturationMix: number;   // 0-1
  preGain: number;         // Pre-clipper gain: -36 to +36 dB, 0.1 dB steps
  outputGain: number;      // Master volume: -96 to +6 dB, 0 dB centered
  
  // Bypass states
  bypassAll: boolean;          // Master bypass
  bypassTapeSim: boolean;      // Tape simulation
  bypassToneStack: boolean;
  bypassSaturation: boolean;
  bypassSpeakerSim: boolean;
  // Note: TransientNode has no bypass control - always active
  
  // Presets
  currentPreset: string | null;
  
  // Actions
  setParameter: <K extends keyof AudioState>(param: K, value: AudioState[K]) => void;
  loadPreset: (preset: PresetConfig) => void;
}
```

### Design Principles

1. **All gain values in dB** - Convert to linear only when setting node values
2. **Never store AudioNodes** - They're not serializable
3. **Persist user preferences** - Using Zustand's persist middleware

---

## UI Components

### Component Hierarchy

```
App
├── EmberSparks (ambient animation overlay)
└── AmpRack
    ├── Header
    │   ├── PresetSelector
    │   ├── BypassButton
    │   └── PowerButton
    ├── InputStage
    │   ├── VinylModeButton (33 Mode - slowed playback, reverb, +8dB boost)
    │   ├── TapeButton (tape sim toggle)
    │   ├── PreviewButton (demo audio through signal chain)
    │   ├── DeviceSelector (disabled on mobile)
    │   ├── Knob (Gain)
    │   └── VUMeter (analog needle)
    ├── ToneStage
    │   ├── Toggle (Bypass)
    │   ├── Knob (Bass)
    │   ├── Knob (Mid)
    │   ├── Knob (Treble)
    │   └── Knob (Presence)
    ├── SaturationStage
    │   ├── Toggle (Bypass)
    │   ├── Knob (Drive)
    │   ├── Knob (Harmonics)
    │   └── Knob (Mix)
    ├── [TransientNode - No UI, always active]
    ├── OutputStage
    │   ├── DeviceSelector (output)
    │   ├── MasterSlider "Gain" (pre-clipper: -36 to +36 dB, 0.1 dB steps)
    │   ├── LEDMeter "Clipper" (pre-clipper peak meter, 18 LEDs, horizontal)
    │   ├── MasterSlider "Master" (post-clipper: -96 to +6 dB, 0 dB centered, non-linear)
    │   └── LEDMeter "DAC out (Don't clip this!)" (post-gain peak meter, 18 LEDs, horizontal)
    └── Credits
```

### Knob Component

Rotary control with:
- Vertical drag interaction
- Double-click to reset to default
- Keyboard navigation (arrow keys)
- Value display with fixed width (prevents layout shifts)
- Skeuomorphic styling with glow effects

### MasterSlider Component

Horizontal slider control optimized for master volume:
- Non-linear mapping: -96 dB to 0 dB (first half), 0 dB to +6 dB (second half)
- 0 dB visually centered on slider track
- Double-click to reset to 0 dB (center)
- Configurable step size (e.g., 0.1 dB for preGain, 0.5 dB for Master)
- Visual fill from left to thumb position
- Used for pre-clipper "Gain" control and post-clipper "Master" volume

### VUMeter Component

Analog needle-style VU meter with:
- Semi-circular arc scale (-60 to +6 dB)
- Smooth needle animation (analog ballistics: 10ms attack, 300ms release)
- Color-coded zones (green → yellow → red)
- Peak hold indicator (small dot, click to reset)
- High-DPI canvas rendering

### LEDMeter Component

Compact horizontal LED-bar style meter with:
- 18 circular LED segments representing thresholds: -60, -54, -48, -42, -36, -30, -24, -18, -12, -9, -6, -4, -2, 0, 2, 4, 6, 8 dB
- Color-coded segments (10 green → 4 yellow → 4 red, left to right)
- Peak hold indicator with decay
- Horizontal layout (330px width, 20px height)
- Mode selection: `'rms'` (default) for average level, `'peak'` for transient detection
- Used in OutputStage:
  - "Clipper" meter: Pre-clipper peak meter (mode="peak") to show when signal clips
  - "DAC out" meter: Post-gain peak meter (mode="peak") with warning label "DAC out (Don't clip this!)"

### EmberSparks Component

Ambient fire spark animation:
- 20 floating ember particles
- Random positions, sizes, delays
- CSS keyframe animation (8-20 second cycles)
- Fixed position overlay, pointer-events disabled

---

## Data Flow

### Parameter Update Flow

```
User Drags Knob
       │
       ▼
┌─────────────────┐
│ Knob.onChange() │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ store.setParameter()    │
│ (Zustand state update)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AmpRack useEffect       │
│ (subscribes to params)  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ audioNode.setXxx()      │
│ (Web Audio node update) │
└─────────────────────────┘
```

### Master Bypass Flow

```
When bypassAll = true:
  InputNode.getOutput() ──────────────────▶ AudioContext.destination
  (all processing nodes disconnected)

When bypassAll = false:
  MediaStream → VinylModeNode → InputNode → TapeSim → ToneStack → Saturation → Transient → SpeakerSim → OutputNode → destination
  (Note: SpeakerSimNode exists but is bypassed/not used)
```

### Audio Flow

```
getUserMedia Stream
       │
       ▼
MediaStreamAudioSourceNode → VinylModeNode → GainNode → AnalyserNode
                                      │         │
                                      │         ▼
                                      │    [REST OF SIGNAL CHAIN]
                                      │         │
                                      │         ▼
                                      │    OutputNode:
                                      │    GainNode → AnalyserNode → WaveShaperNode → GainNode → AnalyserNode → AudioContext.destination
                                      │    (preGain) (preClipper)   (hard clipper)   (Master)   (postGain)
                                      │
                                      └── (Vinyl Mode processes FIRST, before input gain)
```

---

## Performance Considerations

### AudioWorklet Benefits

- Runs on separate audio rendering thread
- Consistent timing (no main thread blocking)
- Lower latency than deprecated ScriptProcessorNode

### Optimization Techniques

1. **Use `setTargetAtTime()`** for smooth parameter changes (prevents clicks)
2. **Memoize expensive computations** with `useMemo`
3. **Use `requestAnimationFrame`** for VU meter updates (not setInterval)
4. **Avoid creating nodes on every render** - Create once, update parameters
5. **Use `getFloatTimeDomainData()`** for accurate metering
6. **Canvas High-DPI scaling** - Use `devicePixelRatio` for crisp rendering

### Memory Management

- Disconnect nodes on component unmount
- Stop MediaStream tracks when not in use
- Clean up animation frames on unmount

---

## Error Handling

### getUserMedia Errors

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (err) {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        // User denied permission
        break;
      case 'NotFoundError':
        // No audio input device
        break;
      case 'NotReadableError':
        // Device in use by another app
        break;
    }
  }
}
```

### AudioContext State

Always check and handle context state:

```typescript
if (ctx.state === 'suspended') {
  await ctx.resume();
}
```

---

## PWA Update Management

### The Problem

PWAs cache JavaScript, CSS, and HTML via Service Workers for offline functionality. Silent auto-updates can cause issues during active audio sessions (audio dropouts, state loss). Users need control over when updates are applied.

### Solution: User-Prompted Updates

The app uses `vite-plugin-pwa` in **prompt mode**, which notifies users when updates are available and lets them choose when to apply:

```typescript
// src/main.tsx
import { registerSW } from 'virtual:pwa-register';

function setupPWAUpdatePrompt(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show toast notification to user
      showUpdateToast(updateSW);
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });
}
```

When a new version is available, a toast notification appears at the bottom of the screen with:
- "New version available" message
- **Refresh** button - applies update immediately
- **Later** button - dismisses toast, user can continue working

### Service Worker Configuration

The `vite.config.ts` uses prompt mode without forced activation:

```typescript
VitePWA({
  registerType: 'prompt',  // User controls when to update
  workbox: {
    // No skipWaiting or clientsClaim - prevents mid-session updates
    cleanupOutdatedCaches: true,
    // ...
  }
})
```

### Versioned Cache Clearing (Fallback)

For breaking changes, the app also implements a one-time cache clearing mechanism:

```typescript
// Increment this when deploying a fix for cache-related bugs
const CACHE_VERSION = 'v5';
const CACHE_CLEARED_KEY = `ember-amp-cache-cleared-${CACHE_VERSION}`;

async function clearStaleCaches(): Promise<void> {
  if (localStorage.getItem(CACHE_CLEARED_KEY)) {
    return; // Already cleared for this version
  }

  // Clear all caches and unregister service workers
  // ... (forces fresh install on next load)
}
```

### When to Increment CACHE_VERSION

Increment `CACHE_VERSION` (e.g., `'v4'` → `'v5'`) when:

1. **Fixing a critical bug that affects cached users** - e.g., audio routing issues
2. **Changing Service Worker configuration** - e.g., modifying workbox settings
3. **Breaking changes to cached assets** - e.g., renaming worklet files

### Developer Checklist for Updates

- [ ] Make changes and test locally
- [ ] Increment `CACHE_VERSION` in `src/main.tsx` (if breaking change)
- [ ] Run `npm run build`
- [ ] Deploy to production
- [ ] Users will see update toast on next visit

---

## Preview Feature

The Preview button allows users to hear how the app sounds without setting up virtual audio cables.

**How It Works:**
1. A demo MP3 file (`public/audio/assumptions.mp3`) is loaded and decoded
2. Audio is routed through the full signal chain (VinylMode → Input → ... → Output)
3. While preview plays, the live mic input is muted to avoid overlap
4. Preview loops until stopped

**Mobile Mode:**
On mobile devices:
- Mic input is disabled (no `getUserMedia` call)
- Device selectors are replaced with info messages
- Users can power on the amp and play the preview only
- This allows trying the app without virtual audio cables (which are desktop-only)

---

## Future Enhancements

1. **Additional Presets** - More amp models and user-saveable presets
2. **Speaker Simulation** - Implement SpeakerSimNode with IR loading UI (node exists but not currently used)
3. **Spectrum Analyzer** - Frequency visualization
4. **MIDI Support** - External controller mapping
5. **WebRTC Output** - Stream processed audio to other applications

---

*Last updated: December 2024*

**Browser Compatibility:**
- **Chrome/Edge (Chromium-based):** Full support including output device selection
- **Firefox/Safari:** Limited support, output device selection not available (uses system default)
