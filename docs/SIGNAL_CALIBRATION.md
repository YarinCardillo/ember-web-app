# Signal Calibration

## Reference Level

Ember Amp uses **-18 dBFS = 0 VU** as the reference level, matching broadcast/pro-audio standards.

## Saturation Stages

All analog emulation stages (tube saturation, tape machine) are calibrated so that:

- **Below 0 VU (-18 dBFS)**: Signal passes cleanly with minimal coloration
- **At 0 VU (-18 dBFS)**: Saturation knee — harmonics begin to be introduced
- **Above 0 VU**: Progressive saturation, compression, and harmonic enrichment

This provides 18dB of headroom before saturation, matching how engineers would gain-stage real analog equipment.

## Why -18 dBFS?

This is the standard reference level used in professional audio (EBU R68). It allows transients to peak well above the reference level without digital clipping, while the analog stages provide musical compression and saturation.

## Implementation Details

### Tube Saturation

The tube saturation worklet normalizes the input signal relative to -18 dBFS before applying the tanh soft-clipping curve:

```javascript
// Reference level: -18 dBFS (0 VU) in linear amplitude
const REFERENCE_LINEAR = 0.12589254117941673; // 10^(-18/20)

// Normalize so -18 dBFS maps to 1.0
const normalizedSample = drySample / REFERENCE_LINEAR;
let wetSample = saturate(normalizedSample, drive) * REFERENCE_LINEAR;
```

Effect:
- Signal at -18 dBFS (0.126 linear) → normalized to 1.0 → hits saturation knee
- Signal at -38 dBFS (0.0126 linear) → normalized to 0.1 → stays in linear region
- Signal at 0 dBFS (1.0 linear) → normalized to 7.94 → heavily saturated

### Tape Saturation

The tape simulation uses pre/post gain staging around the WaveShaper to achieve reference-level calibration:

- **Pre-gain**: +12dB boost so -18 dBFS maps to the harmonic generation threshold
- **Post-gain**: -12dB compensation to restore original level

This ensures the odd harmonic curve (3rd, 5th, 7th) engages progressively as signal exceeds 0 VU.

## Files

- `public/worklets/tube-saturation.worklet.js` - Tube saturation with reference calibration
- `src/audio/nodes/TapeSimNode.ts` - Tape simulation with calibrated WaveShaper
- `src/components/ui/VintageVuMeter.tsx` - VU meter calibrated to same reference
