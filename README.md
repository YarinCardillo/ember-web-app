# Ember Amp Web

> Browser-based HiFi amplifier simulator with real-time DSP processing.  
> **All audio processing happens 100% locally in your browser.**

---

## Overview

Ember Amp Web simulates the warm, rich characteristics of vintage HiFi tube amplifiers directly in your web browser. Route your system audio (Spotify, YouTube, games, etc.) through a virtual audio cable, and the app applies real-time DSP processing including:

- **Tube Saturation** - Analog-modeled soft clipping with harmonic generation
- **4-Band EQ** - Bass, Mid, Treble, Presence (fixed frequency parametric)
- **Hard Clipper** - 0dB output protection circuit
- **Master Bypass** - True bypass for instant A/B comparison

### Target Users

- Audiophiles who want analog warmth without dedicated hardware
- Music listeners looking to enhance PC/laptop audio
- Audio enthusiasts interested in DSP and Web Audio API

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18 + TypeScript | Type-safe UI components |
| Build Tool | Vite | Fast development, ESM native |
| Styling | Tailwind CSS | Utility-first styling |
| Audio Engine | Web Audio API | Native browser audio processing |
| Custom DSP | AudioWorklet | Low-latency, separate-thread processing |
| State | Zustand | Lightweight state management |
| Persistence | localStorage | Settings and presets storage |

**No external audio libraries** - Pure Web Audio API implementation for full control and smaller bundle size.

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A virtual audio cable (see [Audio Setup](#audio-setup))

### Installation

```bash
# Clone the repository
git clone https://github.com/YarinCardillo/ember-web-app.git
cd ember-web-app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### First Run

1. Open `http://localhost:5173` in your browser
2. Follow the Setup Guide to configure your virtual audio cable
3. Select your input device (virtual audio cable)
4. Select your output device (headphones/speakers)
5. Click **Power On** to initialize the audio engine

---

## Audio Setup

To route system audio through Ember Amp Web, you need a virtual audio cable.

### macOS: BlackHole

1. Download [BlackHole](https://existential.audio/blackhole/) (2ch version)
2. Install the package
3. Set **BlackHole 2ch** as system output (System Preferences → Sound → Output)
4. In Ember Amp Web, select **BlackHole 2ch** as **input**
5. In Ember Amp Web, select your speakers/headphones as **output**

**Signal flow:** System Audio → BlackHole → Ember Amp (processing) → Speakers

### Windows: VB-Cable

1. Download [VB-Cable](https://vb-audio.com/Cable/)
2. Install and restart
3. Set **CABLE Input** as default playback device (Sound Settings)
4. In Ember Amp Web, select **CABLE Output** as input

### Linux: PulseAudio

```bash
# Create a null sink
pactl load-module module-null-sink sink_name=virtual_cable

# Create loopback
pactl load-module module-loopback source=virtual_cable.monitor
```

---

## Features

### Analog VU Meters

Beautiful needle-style VU meters with:
- Analog ballistics (smooth needle movement)
- Color-coded scale (green → yellow → red zones)
- Peak hold indicator (click to reset)
- dB scale markings

### Master Bypass

True bypass mode that routes audio directly from input to output, bypassing all processing. Perfect for instant A/B comparisons.

### Output Device Selection

Select your output device directly in the app (Chrome/Edge only). Firefox and Safari users need to set system default output.

### Ambient Effects

Subtle ember spark animation overlay for an atmospheric touch.

---

## Project Structure

```
ember-web-app/
├── public/
│   ├── worklets/                 # AudioWorklet processors
│   │   └── tube-saturation.worklet.js
│   ├── ir/                       # Impulse response files
│   └── ember_app_icon.png        # App icon
│
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts        # Singleton managing AudioContext
│   │   ├── nodes/                # DSP node wrappers
│   │   │   ├── InputNode.ts
│   │   │   ├── PreampNode.ts
│   │   │   ├── ToneStackNode.ts
│   │   │   ├── TubeSaturationNode.ts
│   │   │   ├── SpeakerSimNode.ts
│   │   │   └── OutputNode.ts     # Includes hard clipper
│   │   └── presets/
│   │       └── amp-presets.json
│   │
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Knob.tsx
│   │   │   ├── VUMeter.tsx       # Analog needle meter
│   │   │   ├── Toggle.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── PresetSelector.tsx
│   │   │   └── EmberSparks.tsx   # Ambient animation
│   │   ├── stages/               # Signal chain UI sections
│   │   │   ├── InputStage.tsx
│   │   │   ├── ToneStage.tsx
│   │   │   ├── SaturationStage.tsx
│   │   │   └── OutputStage.tsx
│   │   └── layout/
│   │       ├── AmpRack.tsx       # Main container
│   │       ├── Header.tsx
│   │       ├── Credits.tsx       # About section
│   │       └── SetupGuide.tsx
│   │
│   ├── store/
│   │   └── useAudioStore.ts      # Zustand store
│   │
│   ├── hooks/
│   │   ├── useAudioInput.ts
│   │   └── useAudioAnalyser.ts
│   │
│   ├── types/
│   │   └── audio.types.ts
│   │
│   ├── utils/
│   │   └── dsp-math.ts           # dB conversion, utilities
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── docs/
│   └── ARCHITECTURE.md           # Technical documentation
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Signal Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Virtual   │────▶│   Input     │────▶│   Preamp    │────▶│   Tone      │────▶│    Tube     │────▶│   Speaker   │────▶│   Output    │────▶│  Speakers   │
│ Audio Cable │     │   (Gain)    │     │   (Gain)    │     │   Stack     │     │ Saturation  │     │     Sim     │     │ (+ Clipper) │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Processing Stages

1. **InputNode** - Captures audio via `getUserMedia()`, gain control, level metering
2. **PreampNode** - Gain staging with soft-clip protection
3. **ToneStackNode** - 4-band EQ (Bass 100Hz, Mid 1kHz, Treble 4kHz, Presence 8kHz)
4. **TubeSaturationNode** - AudioWorklet with tanh clipping, harmonic generation
5. **SpeakerSimNode** - ConvolverNode for cabinet simulation (bypassed by default)
6. **OutputNode** - Final gain, hard clipper (0dB), output metering

---

## Available Presets

| Preset | Description |
|--------|-------------|
| **Vintage Marantz** | Warm 70s receiver sound |
| **Tube Warm** | Rich tube amplifier character |
| **Modern Clean** | Transparent with subtle enhancement |
| **Lo-Fi** | Vintage radio vibes |
| **Flat** | EQ only, saturation bypassed |

---

## Development

### Key Commands

```bash
npm run dev      # Start dev server with HMR
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Code Style

- TypeScript strict mode enabled
- Functional React components only
- All gain values stored in dB, converted to linear for Web Audio nodes
- AudioWorklet files must be plain JavaScript in `public/worklets/`

### Adding a New DSP Node

1. Create class in `src/audio/nodes/YourNode.ts`
2. Implement `connect()`, `disconnect()`, and parameter setters
3. Add to AudioEngine signal chain in `AmpRack.tsx`
4. Add corresponding UI stage component

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 110+ | Full support | Output device selection available |
| Edge 110+ | Full support | Output device selection available |
| Firefox 76+ | Partial | No output device selection |
| Safari 14.1+ | Partial | No output device selection |

Requires AudioWorklet support for tube saturation processing.

---

## License

MIT

---

*Vibecoded with 🧡 by [Yarin Cardillo](https://yarincardillo.com)*
