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
│                              Browser                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         React App                              │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐   │  │
│  │  │ UI Components│───▶│Zustand Store│───▶│  Audio Engine   │   │  │
│  │  │ (Knobs, VU)  │    │ (Parameters)│    │  (Singleton)    │   │  │
│  │  └─────────────┘    └─────────────┘    └────────┬────────┘   │  │
│  │                                                  │            │  │
│  │  ┌───────────────────────────────────────────────▼──────────┐ │  │
│  │  │                   Web Audio API                           │ │  │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────────┐│ │  │
│  │  │  │Input│→│Preamp│→│Tone │→│Satur│→│Spkr │→│Output+Clip  ││ │  │
│  │  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────────────┘│ │  │
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
    await this.ctx.audioWorklet.addModule('/worklets/tube-saturation.worklet.js');
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

### InputNode

Captures audio from the user's selected input device.

**Web Audio Nodes Used:**
- `MediaStreamAudioSourceNode` - Captures getUserMedia stream
- `GainNode` - Input level control
- `AnalyserNode` - Level metering

```typescript
class InputNode {
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  private mediaStream: MediaStreamAudioSourceNode | null;
  
  async setInput(deviceId?: string): Promise<void> {
    // Uses native device settings (no processing constraints)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    this.mediaStream = ctx.createMediaStreamSource(stream);
    this.mediaStream.connect(this.gainNode);
  }
  
  setGain(db: number): void {
    this.gainNode.gain.value = dbToLinear(db);
  }
}
```

### PreampNode

Provides gain staging with soft-clip protection.

**Web Audio Nodes Used:**
- `GainNode` - Gain control
- `WaveShaperNode` - Soft clipping curve

```typescript
class PreampNode {
  constructor(ctx: AudioContext) {
    this.gainNode = ctx.createGain();
    this.waveShaperNode = ctx.createWaveShaper();
    
    // Create soft-clipping curve using tanh
    const curve = new Float32Array(65537);
    for (let i = 0; i < 65537; i++) {
      const x = (i - 32768) / 32768;
      curve[i] = Math.tanh(x * 0.8) * 0.8;
    }
    this.waveShaperNode.curve = curve;
    this.waveShaperNode.oversample = '4x';
  }
}
```

### ToneStackNode

4-band EQ inspired by Baxandall/Fender tone controls.

**Frequency Bands:**

| Band | Type | Frequency | Range |
|------|------|-----------|-------|
| Bass | Low Shelf | 100 Hz | ±12 dB |
| Mid | Peaking | 1 kHz | ±12 dB |
| Treble | Peaking | 4 kHz | ±12 dB |
| Presence | High Shelf | 8 kHz | ±12 dB |

**Web Audio Nodes Used:**
- 4x `BiquadFilterNode` connected in series

### TubeSaturationNode

Custom DSP processing via AudioWorklet for tube-style harmonic distortion.

**AudioWorklet Parameters:**
- `drive` (0-1) - Saturation amount
- `harmonics` (0-1) - Harmonic generation intensity
- `mix` (0-1) - Dry/wet blend

**Algorithm:**

```javascript
// Soft clipping
const saturate = (sample, drive) => {
  const k = 2 * drive / (1 - drive + 0.001);
  return Math.tanh(k * sample) / Math.tanh(k);
};

// 2nd harmonic (even) - warm character
const addSecondHarmonic = (sample, amount) => {
  return sample + amount * 0.3 * sample * Math.abs(sample);
};

// 3rd harmonic (odd) - tube character
const addThirdHarmonic = (sample, amount) => {
  return sample + amount * 0.2 * Math.pow(sample, 3);
};
```

### SpeakerSimNode

Cabinet simulation using convolution.

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

### OutputNode

Final gain stage with hard clipper and output metering.

**Web Audio Nodes Used:**
- `GainNode` - Output level control
- `WaveShaperNode` - Hard clipper (0dB ceiling with 4x oversampling)
- `AnalyserNode` - VU metering

**Hard Clipper Implementation:**

```typescript
// Create hard clipping curve at 0dB
const curve = new Float32Array(65537);
for (let i = 0; i < 65537; i++) {
  const x = (i - 32768) / 32768;
  // Linear below ±1.0, hard clip at ±1.0
  curve[i] = Math.max(-1.0, Math.min(1.0, x));
}
this.clipperNode.curve = curve;
this.clipperNode.oversample = '4x'; // Reduces aliasing
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
  outputGain: number;      // dB
  
  // Bypass states
  bypassAll: boolean;          // Master bypass
  bypassToneStack: boolean;
  bypassSaturation: boolean;
  bypassSpeakerSim: boolean;
  
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
    │   ├── DeviceSelector
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
    ├── OutputStage
    │   ├── DeviceSelector (output)
    │   ├── Knob (Gain)
    │   └── VUMeter (analog needle)
    └── Credits
```

### Knob Component

Rotary control with:
- Vertical drag interaction
- Double-click to reset to default
- Keyboard navigation (arrow keys)
- Value display with fixed width (prevents layout shifts)
- Skeuomorphic styling with glow effects

### VUMeter Component

Analog needle-style VU meter with:
- Semi-circular arc scale (±60 to +6 dB)
- Smooth needle animation (analog ballistics: 10ms attack, 300ms release)
- Color-coded zones (green → yellow → red)
- Peak hold indicator (small dot, click to reset)
- High-DPI canvas rendering

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
  InputNode → Preamp → ToneStack → Saturation → SpeakerSim → OutputNode → destination
```

### Audio Flow

```
getUserMedia Stream
       │
       ▼
MediaStreamAudioSourceNode → GainNode → AnalyserNode
                                              │
                                              ▼
                                    [REST OF SIGNAL CHAIN]
                                              │
                                              ▼
                   GainNode → WaveShaperNode → AnalyserNode → AudioContext.destination
                              (hard clipper)
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

## Future Enhancements

1. **Additional Presets** - More amp models and user-saveable presets
2. **IR Library** - Collection of cabinet impulse responses
3. **Spectrum Analyzer** - Frequency visualization
4. **MIDI Support** - External controller mapping
5. **WebRTC Output** - Stream processed audio to other applications

---

*Last updated: December 2024*
