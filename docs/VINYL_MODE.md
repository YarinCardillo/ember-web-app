# Vinyl Mode

Simulates the pitch/speed reduction of playing a 45 RPM record at 33 RPM.

## Intensity Control

The vinyl intensity slider controls how much slowdown is applied:

| Intensity | Speed Ratio | Speed Change | Pitch Change |
|-----------|-------------|--------------|--------------|
| 0.0       | 1.0         | 0%           | 0 semitones  |
| 0.3 (default) | 0.92    | -8%          | ~-1.4 semitones |
| 0.5       | 0.867       | -13%         | ~-2.4 semitones |
| 1.0       | 0.733       | -27%         | ~-5.3 semitones |

### Why the Default is 0.3

Full 45 to 33 RPM simulation (-27% speed) is authentic but too extreme for most listeners. The default of 0.3 provides a subtle "slowed & reverb" aesthetic popular in modern music without making tracks unrecognizable.

### Formula

```
ratio = 1.0 - (intensity * (1.0 - 0.733))
ratio = 1.0 - (intensity * 0.267)
```

Where:
- `intensity` ranges from 0.0 to 1.0
- `ratio` is the playback rate (1.0 = normal speed, 0.733 = full vinyl)

## Crossfade Transitions

When toggling vinyl mode on/off, a 50ms crossfade prevents clicks and pops:

- **Enable**: Dry signal fades out, wet (vinyl) signal fades in
- **Disable**: Wet signal fades out, dry signal fades in

This ensures smooth transitions even during audio playback.

### Implementation

The crossfade uses Web Audio API's `linearRampToValueAtTime` for smooth gain transitions:

```typescript
const CROSSFADE_TIME = 0.05; // 50ms

// Fade vinyl mixer in
this.vinylMixerGain.gain.setValueAtTime(this.vinylMixerGain.gain.value, now);
this.vinylMixerGain.gain.linearRampToValueAtTime(1.0, now + CROSSFADE_TIME);

// Fade bypass out
this.bypassGain.gain.setValueAtTime(this.bypassGain.gain.value, now);
this.bypassGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_TIME);
```

## Signal Chain

When vinyl mode is active:

```
Input -> Buffer (variable speed) -> Dry ---------> Mixer -> Boost (+8dB) -> Output
                                 -> Convolver -> Wet --/
```

When bypassed:

```
Input -> Bypass -> Output
```

## UI

The intensity slider appears to the left of the vinyl disc icon in the INPUT section header. It is only visible when vinyl mode is active, with a 200ms fade transition.

### Slider Specifications

- Height: 40px (matches icon height)
- Track width: 5px
- Thumb: 12px diameter
- Color: #F5A524 (amber/gold)
- Tooltip: Shows current speed percentage on hover

## Files

- `src/store/useAudioStore.ts` - State management for intensity
- `src/audio/nodes/VinylModeNode.ts` - Audio processing with intensity control
- `src/hooks/useVinylMode.ts` - State machine and callbacks
- `src/components/ui/VinylIntensitySlider.tsx` - UI component
- `src/components/stages/InputStage.tsx` - Integration point
- `src/components/layout/AmpRack.tsx` - Callback wiring
