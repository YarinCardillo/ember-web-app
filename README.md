# Ember Amp

> Browser-based HiFi amplifier simulator with real-time DSP processing.  
> **All audio processing happens 100% locally in your browser.**

---

## Overview

Ember Amp simulates the warm, rich characteristics of vintage HiFi tube amplifiers directly in your web browser. Route your system audio (Spotify, YouTube, games, etc.) through a virtual audio cable, and the app applies real-time DSP processing including:

- **33 Mode (Vinyl Mode)** - Slowed playback with reverb and +8dB boost (to recover lost volume from reverb) for vinyl record simulation (processes audio FIRST, before input gain)
- **Preview Mode** - Play demo audio through the signal chain to hear how the app sounds before setting up virtual cables
- **Tape Simulation** - Wow/flutter, head bump, HF rolloff, stereo widening, odd harmonic saturation (3rd, 5th, 7th harmonics with 1/n³ decay)
- **Tube Saturation** - Analog-modeled soft clipping with even harmonic generation (2nd, 4th, 6th harmonics with 1/n² decay)
- **Transient Shaper** - SPL Transient Designer-style processor using sidechain filtering (bass-focused detection, fullband processing), tightens low-end transients and recovers dynamic range
- **4-Band EQ** - Bass, Mid, Treble, Presence (fixed frequency parametric)
- **Hard Clipper** - 0dB output protection circuit
- **Bypass** - True bypass for instant A/B comparison

### Target Users

- Audiophiles who want analog warmth without dedicated hardware
- Music listeners looking to enhance PC/laptop audio
- Audio enthusiasts interested in DSP and Web Audio API

### Mobile Support

Mobile users can power on the app and use the **Preview** feature to hear how it sounds. Mic input and device selection are disabled on mobile (virtual audio cables are desktop-only).

---

## Tech Stack

| Layer        | Technology            | Purpose                                 |
|--------------|-----------------------|-----------------------------------------|
| Framework    | React 18 + TypeScript | Type-safe UI components                 |
| Build Tool   | Vite                  | Fast development, ESM native            |
| Styling      | Tailwind CSS          | Utility-first styling                   |
| Audio Engine | Web Audio API         | Native browser audio processing         |
| Custom DSP   | AudioWorklet          | Low-latency, separate-thread processing |
| State        | Zustand               | Lightweight state management            |
| Persistence  | localStorage          | Settings and presets storage            |

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

To route system audio through Ember Amp, you need a virtual audio cable.

Signal flow: System Audio → Virtual Cable Input → Virtual Cable Output → Ember Input → Ember Processing → Ember Output → Speakers

### macOS: BlackHole

1. Download [BlackHole](https://existential.audio/blackhole/) (2ch version)
2. Install the package
3. Set **BlackHole 2ch** as system output (System Preferences → Sound → Output)
4. In Ember Amp Web, select **BlackHole 2ch** as **input**
5. In Ember Amp Web, select your speakers/headphones as **output**

### Windows: VB-Cable

1. Download [VB-Cable](https://vb-audio.com/Cable/)
2. Install and restart
3. Set **CABLE Input** as default playback device (Sound Settings)
4. In Ember Amp, select **CABLE Output** as input

### Linux: PipeWire (Arch, Fedora, Ubuntu 22.10+)

```bash 
# Create a null sink
pactl load-module module-null-sink sink_name=ember_virtual sink_properties=device.description="Ember_Virtual"
```

And then make it persistent with config:
Create ~/.config/pipewire/pipewire.conf.d/ember-virtual.conf

```bash 
context.exec = [
    { path = "pactl" args = "load-module module-null-sink sink_name=ember_virtual sink_properties=device.description=Ember_Virtual" }
]
```

Then restart PipeWire

```bash 
systemctl --user restart pipewire
```

---

## Features

### Analog VU Meters

Beautiful dual-needle stereo VU meter with:
- **Dual-needle stereo display** - White needle for Left channel, red needle for Right channel
- **True stereo separation** - Uses `ChannelSplitterNode` for accurate L/R metering
- Analog ballistics (IEC 60268-17 compliant, 65ms time constant)
- Color-coded scale (green → yellow → red zones)
- Peak hold indicator LED (lights at 0 VU / -18 dBFS)
- dB scale markings (-20 VU to +3 VU)

### LED Output Meters

Two horizontal stereo needle meters in the output section:
- **Clipper Meter** (pre-clipper): Shows peak level entering the hard clipper, warns when clipping occurs
- **DAC Out Meter** (post-gain): Shows peak level after Master gain, warns when signal exceeds 0dB (potential DAC clipping)
- **True stereo separation** - Each meter displays independent L/R channels via `ChannelSplitterNode`
- Needle indicators with peak hold markers
- Color-coded zones (green → yellow → red) with dB scale (-48 to +6 dB)

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
│   │   ├── tube-saturation.worklet.js
│   │   ├── tape-wobble.worklet.js
│   │   ├── transient.worklet.js
│   │   └── vinyl-buffer.worklet.js
│   ├── audio/                    # Audio assets
│   │   └── assumptions.mp3       # Preview demo audio
│   ├── assets/                   # UI assets
│   │   └── Ampex_orange_transparent.gif
│   ├── ir/                       # Impulse response files
│   └── ember_app_icon.png        # App icon
│
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts        # Singleton managing AudioContext
│   │   ├── nodes/                # DSP node wrappers
│   │   │   ├── InputNode.ts      # Stereo analyser via ChannelSplitter
│   │   │   ├── VinylModeNode.ts  # 33 Mode - slowed playback, reverb, +8dB boost
│   │   │   ├── TapeSimNode.ts    # Wow/flutter, head bump, HF rolloff
│   │   │   ├── ToneStackNode.ts
│   │   │   ├── TubeSaturationNode.ts
│   │   │   ├── TransientNode.ts  # Bass transient shaper (< 150Hz)
│   │   │   ├── SpeakerSimNode.ts
│   │   │   └── OutputNode.ts     # Hard clipper + stereo pre/post analysers
│   │   └── presets/
│   │       └── amp-presets.json
│   │
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Knob.tsx
│   │   │   ├── VintageVuMeter.tsx # Dual-needle stereo VU meter (L/R)
│   │   │   ├── StereoMeter.tsx   # Stereo needle meter (L/R channels)
│   │   │   ├── StereoMeterMinimal.tsx # Minimal stereo needle meter
│   │   │   ├── OutputMeter.tsx   # Output section LED-bar meters
│   │   │   ├── MasterSlider.tsx  # Non-linear master volume slider
│   │   │   ├── Toggle.tsx
│   │   │   ├── VinylButton.tsx   # 33 Mode button with countdown timer
│   │   │   ├── TapeButton.tsx    # Animated tape sim toggle
│   │   │   ├── PreviewButton.tsx # Demo audio preview
│   │   │   ├── Slider.tsx
│   │   │   ├── PresetSelector.tsx
│   │   │   └── EmberSparks.tsx   # Ambient animation
│   │   ├── stages/               # Signal chain UI sections
│   │   │   ├── InputStage.tsx    # Contains VinylModeButton (33) and TapeButton
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
│   │   ├── useAudioAnalyser.ts
│   │   └── useVinylMode.ts      # State machine for 33 Mode
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
│   ├── ARCHITECTURE.md           # Technical documentation
│   └── VU_METER.md               # VU meter implementation details
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
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌──────────────────────────────────────────────┐
│ Virtual │──▶│  33 Mode │──▶│  Input  │──▶│  Tape   │──▶│  EQ     │──▶│  Tubes  │──▶│Transient│──▶│                  Output                      │
│  Cable  │   │  (Vinyl) │   │ (Gain)  │   │         │   │         │   │         │   │ (<150Hz)│   │   PreGain→ClipperMeter→Clip→Master→DACMeter  │  
└─────────┘   └──────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └──────────────────────────────────────────────┘ 
```

### Processing Stages

1. **VinylModeNode** - Slowed playback (0.733x), synthetic reverb, and +8dB boost for vinyl record simulation. Processes audio FIRST, before input gain. Activated via the "33" button in the Input stage.
2. **InputNode** - Captures audio via `getUserMedia()`, gain control (-36 to +36 dB), stereo level metering via `ChannelSplitterNode` (dual-needle VU meter + peak LED)
3. **TapeSimNode** - Wow/flutter, head bump (+2dB @ 80Hz), HF rolloff (15kHz), stereo widening, odd harmonic saturation (3rd, 5th, 7th with 1/n³ decay)
4. **ToneStackNode** - 4-band EQ (Bass 75Hz, Mid 800Hz, Treble 4kHz, Presence 11kHz)
5. **TubeSaturationNode** - AudioWorklet with tanh clipping, even harmonic generation (2nd, 4th, 6th with 1/n² decay), controllable via Drive and Harmonics knobs
6. **TransientNode** - SPL Transient Designer-style processor using sidechain filtering (150Hz lowpass for detection, fullband gain modulation). Fixed parameters: Attack 75%, Sustain 0%, Mix 55%. Always active, no user controls.
7. **OutputNode** - Pre-clipper gain (-36 to +36 dB) → Pre-clip stereo metering (L/R via `ChannelSplitterNode`) → Hard clipper (0dB, 4x oversampling) → Master gain (-96 to +6 dB, 0 dB centered) → Post-gain stereo metering (L/R)

**Note:** `SpeakerSimNode` exists in the codebase but is not currently used in the signal chain. It may be implemented in future versions for cabinet simulation via impulse response convolution.

---

## Available Presets

| Preset              | Description                                      |
|---------------------|--------------------------------------------------|
| **Starter Preset**  | Neutral settings, all modules on (default state) |
| **Vintage Marantz** | Warm 70s receiver sound                          |
| **Tube Warm**       | Rich tube amplifier character                    |
| **Modern Clean**    | Transparent with subtle enhancement              |
| **Lo-Fi**           | Vintage radio vibes                              |
| **Flat**            | EQ only, saturation bypassed                     |

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

| Browser      | Support         | Notes                                             |
|--------------|-----------------|---------------------------------------------------|
| Chrome 110+  | ✅ Full support | Output device selection available                 |
| Edge 110+    | ✅ Full support | Output device selection available                 |
| Brave, Opera | ✅ Full support | Chromium-based, output device selection available |
| Firefox 76+  | ⚠️ Not supported| No output device selection (uses system default)  |
| Safari 14.1+ | ⚠️ Not supported| No output device selection (uses system default)  |

**Recommended:** Use Chromium-based browsers (Chrome, Edge, Brave, Opera) for full functionality.

Requires AudioWorklet support for custom DSP processing.

---

## License

MIT

---

*Made with care by [Yarin Cardillo](https://yarincardillo.com)*
