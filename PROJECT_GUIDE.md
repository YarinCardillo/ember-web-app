# Ember Amp Web - Project Guide

> Browser-based HiFi amplifier simulator with real-time DSP processing.
> **All audio processing happens 100% locally in the browser.**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [DSP Modules](#dsp-modules)
6. [UI Concept](#ui-concept)
7. [State Management](#state-management)
8. [Audio Input Setup](#audio-input-setup)
9. [Implementation Order](#implementation-order)
10. [Presets](#presets)

---

## Overview

**Ember Amp Web** è una web app che simula le caratteristiche sonore di amplificatori HiFi vintage. L'utente routa l'audio del proprio sistema (Spotify, YouTube, etc.) attraverso un virtual audio cable, e la web app applica processing DSP in real-time.

### Core Principles

- **100% Local Processing**: Zero audio data leaves the browser
- **Real-time DSP**: Low-latency processing via Web Audio API + AudioWorklet
- **Audiophile-focused UI**: Skeuomorphic design with analog aesthetics
- **No external audio libraries**: Pure Web Audio API implementation

### Target Users

- Audiofili che vogliono simulazione di impianto HiFi analogico
- Chi ascolta musica da PC e vuole "warmth" senza hardware dedicato
- Tech-savvy users comfortable with virtual audio cable setup

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S SYSTEM                           │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │ Spotify/ │───▶│ Virtual Cable   │───▶│ Browser Input    │   │
│  │ YouTube  │    │ (BlackHole/     │    │ (getUserMedia)   │   │
│  │ Any App  │    │  VB-Cable)      │    │                  │   │
│  └──────────┘    └─────────────────┘    └────────┬─────────┘   │
└──────────────────────────────────────────────────┼──────────────┘
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EMBER AMP WEB                              │
│                                                                 │
│  ┌─────────────┐                                                │
│  │ Input Stage │─────────────────────────────────────┐          │
│  │ (Gain/Meter)│                                     │          │
│  └─────────────┘                                     ▼          │
│                    ┌─────────────────────────────────────────┐  │
│                    │            SIGNAL CHAIN                 │  │
│                    │                                         │  │
│                    │  ┌───────┐  ┌───────┐  ┌───────────┐   │  │
│                    │  │PreAmp │─▶│ToneEQ │─▶│Tube Sat.  │   │  │
│                    │  │(Gain) │  │(Bass/ │  │(Warmth/   │   │  │
│                    │  │       │  │ Mid/  │  │ Harmonics)│   │  │
│                    │  │       │  │ Treble│  │           │   │  │
│                    │  └───────┘  └───────┘  └─────┬─────┘   │  │
│                    │                              ▼         │  │
│                    │  ┌───────────┐  ┌───────┐  ┌───────┐   │  │
│                    │  │Speaker Sim│◀─│Output │◀─│Compres│   │  │
│                    │  │(IR/Model) │  │Stage  │  │sor    │   │  │
│                    │  └─────┬─────┘  └───────┘  └───────┘   │  │
│                    └────────┼────────────────────────────────┘  │
│                             ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Output Meter   │──▶ audioCtx.destination  │
│                    │  (VU/Peak/RMS)  │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Signal Flow

1. **Input**: `getUserMedia()` cattura audio dal virtual cable
2. **Preamp**: Gain staging iniziale
3. **Tone Stack**: EQ a 4 bande (Bass, Mid, Treble, Presence)
4. **Tube Saturation**: Soft clipping + harmonic generation (AudioWorklet)
5. **Compressor**: Opto-style compression
6. **Speaker Sim**: Cabinet simulation via ConvolverNode
7. **Output**: Final gain + metering → `audioContext.destination`

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | React 18 + TypeScript | Type safety, component modularity |
| **Build Tool** | Vite | Fast HMR, ESM native, minimal config |
| **Styling** | Tailwind CSS + Custom CSS | Utility classes + custom skeuomorphic styles |
| **Audio Engine** | Web Audio API | Native browser API, no dependencies |
| **Custom DSP** | AudioWorklet | Separate thread, low latency |
| **State** | Zustand | Lightweight, perfect for audio parameters |
| **Persistence** | localStorage | Preset save/load, user settings |

### Why No External Audio Libraries?

- **Tone.js, Pizzicato, etc.** add abstraction overhead
- Direct Web Audio API gives full control over the signal chain
- Smaller bundle size
- Better understanding of what's happening under the hood
- Portfolio value: shows you can work at the metal

---

## Project Structure

```
ember-amp-web/
├── public/
│   ├── worklets/
│   │   ├── tube-saturation.worklet.js
│   │   ├── compressor.worklet.js
│   │   └── speaker-sim.worklet.js
│   └── ir/                          # Impulse Response files
│       ├── vintage-cabinet.wav
│       └── modern-cabinet.wav
│
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts           # Singleton, manages AudioContext
│   │   ├── nodes/
│   │   │   ├── InputNode.ts         # getUserMedia wrapper
│   │   │   ├── PreampNode.ts        # Gain staging
│   │   │   ├── ToneStackNode.ts     # 4-band EQ
│   │   │   ├── TubeSaturationNode.ts# AudioWorklet wrapper
│   │   │   ├── CompressorNode.ts    # DynamicsCompressor wrapper
│   │   │   └── SpeakerSimNode.ts    # ConvolverNode + IR loader
│   │   ├── worklets/
│   │   │   └── processors/          # AudioWorkletProcessor source
│   │   └── presets/
│   │       └── amp-presets.json
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Knob.tsx             # Rotary control
│   │   │   ├── VUMeter.tsx          # Analog-style meter
│   │   │   ├── Toggle.tsx           # Bypass switches
│   │   │   ├── Slider.tsx           # Linear fader
│   │   │   └── PresetSelector.tsx
│   │   ├── stages/
│   │   │   ├── InputStage.tsx
│   │   │   ├── PreampStage.tsx
│   │   │   ├── ToneStage.tsx
│   │   │   ├── SaturationStage.tsx
│   │   │   ├── CompressorStage.tsx
│   │   │   └── OutputStage.tsx
│   │   └── layout/
│   │       ├── AmpRack.tsx          # Main container
│   │       ├── Header.tsx
│   │       └── SetupGuide.tsx       # Virtual cable tutorial
│   │
│   ├── store/
│   │   └── useAudioStore.ts         # Zustand store
│   │
│   ├── hooks/
│   │   ├── useAudioInput.ts         # Device enumeration + selection
│   │   ├── useAudioAnalyser.ts      # Metering hook
│   │   └── usePresets.ts
│   │
│   ├── utils/
│   │   ├── dsp-math.ts              # dB conversion, smoothing
│   │   └── audio-utils.ts           # Helper functions
│   │
│   ├── types/
│   │   └── audio.types.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .cursorrules
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## DSP Modules

### 1. Input Node

**Purpose**: Cattura audio dal virtual cable via `getUserMedia()`

**Features**:
- Device enumeration e selezione
- Input gain control (-∞ to +12dB)
- Input level metering (RMS + Peak)

**Web Audio Nodes**:
- `MediaStreamAudioSourceNode`
- `GainNode`
- `AnalyserNode`

```typescript
// Pseudocode
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { deviceId: selectedDeviceId }
});
const source = ctx.createMediaStreamSource(stream);
```

---

### 2. Preamp Node

**Purpose**: Gain staging iniziale, simula il preamp stage di un ampli

**Features**:
- Gain control (-12dB to +24dB)
- Soft clip protection (previene harsh digital clipping)

**Web Audio Nodes**:
- `GainNode`
- `WaveShaperNode` (optional, per soft clip)

---

### 3. Tone Stack Node

**Purpose**: EQ a 4 bande stile Baxandall/Fender

**Bands**:

| Band | Type | Frequency | Range |
|------|------|-----------|-------|
| Bass | Low Shelf | 100 Hz | ±12 dB |
| Mid | Peaking | 1 kHz | ±12 dB |
| Treble | High Shelf | 4 kHz | ±12 dB |
| Presence | High Shelf | 8 kHz | ±12 dB |

**Web Audio Nodes**:
- 4x `BiquadFilterNode`

```typescript
// Bass filter setup
bassFilter.type = 'lowshelf';
bassFilter.frequency.value = 100;
bassFilter.gain.value = bassDb; // -12 to +12
```

---

### 4. Tube Saturation Node (AudioWorklet)

**Purpose**: Simula la saturazione armonica delle valvole

**Features**:
- Soft clipping (tanh-based)
- 2nd and 3rd harmonic generation
- Drive control (0-100%)
- Mix control (dry/wet)

**Algorithm**:

```javascript
// Soft clipping with harmonic generation
const saturate = (sample, drive) => {
  const k = 2 * drive / (1 - drive + 0.001);
  return Math.tanh(k * sample);
};

// Even harmonics (2nd) - "warm" character
const addSecondHarmonic = (sample, amount) => {
  return sample + amount * sample * Math.abs(sample);
};

// Odd harmonics (3rd) - "tube" character  
const addThirdHarmonic = (sample, amount) => {
  return sample + amount * Math.pow(sample, 3);
};
```

**AudioWorklet Parameters**:
- `drive`: 0.0 - 1.0
- `harmonics`: 0.0 - 1.0
- `mix`: 0.0 - 1.0 (dry/wet)

---

### 5. Compressor Node

**Purpose**: Opto-style compression per "glue" e sustain

**Features**:
- Threshold (-60dB to 0dB)
- Ratio (1:1 to 20:1)
- Attack (0.001s to 1s)
- Release (0.01s to 1s)
- Makeup gain
- Gain reduction metering

**Web Audio Nodes**:
- `DynamicsCompressorNode`

```typescript
compressor.threshold.value = -24;  // dB
compressor.ratio.value = 4;        // 4:1
compressor.attack.value = 0.003;   // 3ms
compressor.release.value = 0.25;   // 250ms
compressor.knee.value = 6;         // Soft knee
```

---

### 6. Speaker Simulation Node

**Purpose**: Simula la risposta in frequenza di speaker cabinet

**Implementation Options**:

**A) Convolution (IR-based)**:
- Usa `ConvolverNode` con Impulse Response files
- Più realistico, suono "reale" di cabinet
- Richiede IR files (wav)

**B) Modeling (filter-based)**:
- Catena di filtri che approssimano la risposta
- Più leggero, niente file esterni
- Meno realistico ma customizzabile

```typescript
// Convolution approach
const convolver = ctx.createConvolver();
const irBuffer = await loadImpulseResponse('/ir/vintage-cabinet.wav');
convolver.buffer = irBuffer;
```

---

### 7. Output Node

**Purpose**: Gain finale e metering

**Features**:
- Output gain (-∞ to +6dB)
- VU Meter (analog ballistics)
- Peak meter with hold
- Limiter protection (optional)

**Web Audio Nodes**:
- `GainNode`
- `AnalyserNode`

---

## UI Concept

### Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│  ═══════════════════ EMBER AMP WEB ═══════════════════         │
│                                                                 │
│  ┌─────────┐  ┌─────────────────────────────────────┐  ┌─────┐ │
│  │ ▓▓▓▓░░░ │  │  [BASS]   [MID]   [TREBLE]  [PRES] │  │ VU  │ │
│  │ INPUT   │  │    ◯       ◯        ◯         ◯    │  │ ▓▓▓ │ │
│  │  -12dB  │  │   +3      flat     +2        +1    │  │ ▓▓░ │ │
│  └─────────┘  └─────────────────────────────────────┘  │ ▓░░ │ │
│                                                        └─────┘ │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │    DRIVE         │  │    OUTPUT        │   [Vintage Marantz]│
│  │      ◯           │  │      ◯           │   [Tube Warm     ]│
│  │     4.2          │  │     0dB          │   [Modern Clean  ]│
│  │   ○ BYPASS       │  │                  │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
│  ════════════════════════════════════════════════════════════  │
└─────────────────────────────────────────────────────────────────┘
```

### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background | Charcoal | `#1a1a1a` |
| Surface | Dark Gray | `#252525` |
| Accent | Ember Orange | `#ff6b35` |
| Glow | Warm Amber | `#ffaa00` |
| Text Primary | Light Gray | `#e0e0e0` |
| Text Secondary | Mid Gray | `#888888` |
| Meter Green | Warm Green | `#4ade80` |
| Meter Yellow | Warning | `#fbbf24` |
| Meter Red | Clip | `#ef4444` |

### UI Components Specs

#### Knob
- Drag interaction (vertical movement)
- Double-click to reset to default
- Value display below
- Subtle glow on active
- Keyboard accessible (arrow keys)

#### VU Meter
- Analog ballistics (attack ~10ms, release ~300ms)
- Peak hold with decay
- Segmented LED-style or continuous
- Range: -60dB to +6dB
- Color gradient: green → yellow → red

#### Toggle/Bypass
- LED indicator
- Click to toggle
- Visual feedback (glow when active)

---

## State Management

### Zustand Store Structure

```typescript
interface AudioState {
  // Engine status
  isInitialized: boolean;
  isRunning: boolean;
  inputDeviceId: string | null;
  availableDevices: MediaDeviceInfo[];
  
  // Input
  inputGain: number;        // dB, -Infinity to +12
  
  // Tone Stack
  bass: number;             // dB, -12 to +12
  mid: number;              // dB, -12 to +12
  treble: number;           // dB, -12 to +12
  presence: number;         // dB, -12 to +12
  
  // Saturation
  drive: number;            // 0 to 1
  saturationMix: number;    // 0 to 1
  
  // Compressor
  compThreshold: number;    // dB
  compRatio: number;        // ratio (e.g., 4 for 4:1)
  compAttack: number;       // seconds
  compRelease: number;      // seconds
  
  // Output
  outputGain: number;       // dB
  
  // Bypass states
  bypassToneStack: boolean;
  bypassSaturation: boolean;
  bypassCompressor: boolean;
  bypassSpeakerSim: boolean;
  
  // Presets
  currentPreset: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => void;
  setInputDevice: (deviceId: string) => void;
  setParameter: (param: string, value: number | boolean) => void;
  loadPreset: (presetId: string) => void;
  savePreset: (name: string) => void;
}
```

### Important Notes

- **Never store AudioNodes in state** (not serializable)
- All gain values in **dB** (convert to linear when setting nodes)
- Use `setTargetAtTime()` for smooth parameter changes
- Keep node references in AudioEngine singleton

---

## Audio Input Setup

### macOS: BlackHole

1. Download BlackHole (2ch) from [existential.audio](https://existential.audio/blackhole/)
2. Install the package
3. Set **BlackHole 2ch** as system output (System Preferences → Sound → Output)
4. In Ember Amp Web, select **BlackHole 2ch** as **input**
5. In Ember Amp Web, select your speakers/headphones as **output**

**Signal flow:** System Audio → BlackHole → Ember Amp (processing) → Speakers

### Windows: VB-Cable

1. Download VB-Cable from [vb-audio.com](https://vb-audio.com/Cable/)
2. Install and restart
3. Set **CABLE Input** as default playback device (Sound Settings)
4. In Ember Amp Web, select **CABLE Output** as input
5. Route Ember output to your actual speakers

### Linux: PulseAudio/PipeWire

```bash
# Create a null sink
pactl load-module module-null-sink sink_name=virtual_cable
# Create loopback from applications to virtual cable
pactl load-module module-loopback source=virtual_cable.monitor
```

---

## Implementation Order

### Phase 1: Foundation
1. ✅ Setup Vite + React + TypeScript + Tailwind
2. Create AudioEngine singleton
3. Implement basic input → output passthrough
4. Add device enumeration and selection

### Phase 2: Core DSP
5. Implement ToneStackNode (4-band EQ)
6. Create TubeSaturation AudioWorklet
7. Add CompressorNode wrapper
8. Implement SpeakerSimNode (start with filters, add IR later)

### Phase 3: UI
9. Create Knob component
10. Create VUMeter component
11. Wire up Zustand store
12. Build stage components (Input, Tone, Drive, Output)
13. Create AmpRack layout

### Phase 4: Polish
14. Add presets system
15. Implement SetupGuide component
16. Add keyboard shortcuts
17. Responsive layout adjustments
18. Performance optimization

### Phase 5: Launch
19. Deploy to Vercel/Netlify
20. Write README with setup guide
21. Create demo video

---

## Presets

### Structure

```json
{
  "vintage-marantz": {
    "name": "Vintage Marantz",
    "description": "Warm 70s receiver sound",
    "bass": 2,
    "mid": 0,
    "treble": 1,
    "presence": 2,
    "drive": 0.25,
    "saturationMix": 0.6,
    "compThreshold": -18,
    "compRatio": 2
  },
  "tube-warm": {
    "name": "Tube Warm",
    "description": "Rich tube amplifier character",
    "bass": 4,
    "mid": -1,
    "treble": -2,
    "presence": 0,
    "drive": 0.5,
    "saturationMix": 0.8,
    "compThreshold": -24,
    "compRatio": 3
  },
  "modern-clean": {
    "name": "Modern Clean",
    "description": "Transparent with subtle enhancement",
    "bass": 1,
    "mid": 0,
    "treble": 2,
    "presence": 1,
    "drive": 0.1,
    "saturationMix": 0.3,
    "compThreshold": -12,
    "compRatio": 1.5
  },
  "lo-fi": {
    "name": "Lo-Fi",
    "description": "Vintage radio vibes",
    "bass": -4,
    "mid": 6,
    "treble": -6,
    "presence": -4,
    "drive": 0.7,
    "saturationMix": 1.0,
    "compThreshold": -30,
    "compRatio": 6
  }
}
```

---

## Key Technical Notes

### AudioContext Lifecycle
```typescript
// MUST create after user interaction
button.addEventListener('click', async () => {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
});
```

### Parameter Smoothing
```typescript
// DON'T: causes clicks
gainNode.gain.value = newValue;

// DO: smooth transition
gainNode.gain.setTargetAtTime(newValue, ctx.currentTime, 0.01);
```

### dB Conversion
```typescript
const dbToLinear = (db: number): number => Math.pow(10, db / 20);
const linearToDb = (linear: number): number => 20 * Math.log10(linear);
```

### Cleanup
```typescript
useEffect(() => {
  // Setup audio nodes...
  
  return () => {
    // ALWAYS disconnect on unmount
    sourceNode.disconnect();
    gainNode.disconnect();
    // etc.
  };
}, []);
```

---

## Resources

- [Web Audio API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [Enter Audio Worklet - Google](https://developer.chrome.com/blog/audio-worklet/)
- [BlackHole Virtual Audio](https://existential.audio/blackhole/)
- [VB-Cable](https://vb-audio.com/Cable/)

---

## License

MIT

---

*Built with 🔥 by Yarin Cardillo*
