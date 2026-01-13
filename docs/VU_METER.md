# VU Meter Implementation

## Overview

The VintageVuMeter component implements a classic analog-style VU meter with accurate ballistics conforming to IEC 60268-17.

## Timing (IEC 60268-17 Compliance)

The VU meter uses exponential smoothing with a time constant of **65ms**.

This ensures the needle reaches 99% of the final value in ~300ms, matching the ballistic response of real analog VU meters.

### Why 65ms and not 300ms?

Exponential smoothing reaches:
- 63% at 1 time constant (τ)
- 86% at 2 time constants
- 95% at 3 time constants
- 98% at 4 time constants
- 99% at 5 time constants

To reach 99% in 300ms: τ = 300ms / 5 = 60-65ms

Using 300ms as the time constant would only reach 63% in 300ms, making the meter too sluggish and inaccurate.

## Calibration

0 VU is calibrated to **-18 dBFS**, the broadcast/pro-audio reference level.

| dBFS | VU   | Description |
|------|------|-------------|
| -38  | -20  | Minimum scale |
| -18  | 0    | Reference level |
| -15  | +3   | Maximum scale |
| 0    | +18  | Digital clipping (way past red zone) |

This provides 18dB of headroom for transients before digital clipping occurs.

### Why -18 dBFS?

The +4 dBu reference mentioned in analog VU meter specs is an analog voltage standard (1.228V RMS). In the digital domain, -18 dBFS is the widely accepted equivalent, used in broadcast (EBU R68) and professional audio production.

## VU Scale Range

The meter displays a range from **-20 VU to +3 VU**, which corresponds to:
- -38 dBFS to -15 dBFS in the digital domain
- The red zone (0 to +3 VU) indicates signal levels approaching the reference level and above

## Measurement Method

The meter uses **RMS (Root Mean Square)** measurement, which represents the average signal energy - this is the correct method for VU meters, as opposed to peak measurement.

```typescript
// RMS calculation
let sum = 0;
for (let i = 0; i < bufferLength; i++) {
  sum += dataArray[i] * dataArray[i];
}
const rmsLevel = Math.sqrt(sum / bufferLength);
```

## Peak LED

A separate peak indicator LED lights up when the signal reaches **0 VU (-18 dBFS)**. It features:
- **Hold time**: 1000ms (LED stays lit after peak)
- **Fade time**: 1500ms (gradual fade after hold period)

### Why 0 VU and not closer to digital clipping?

This threshold is intentional. In Ember Amp's signal chain, the tape machine and tube saturation stages are calibrated to begin saturating around 0 VU (-18 dBFS), matching real analog equipment behavior:

| Level | Analog behavior |
|-------|-----------------|
| < 0 VU | Clean signal |
| **0 VU** | Saturation begins (harmonics introduced) |
| +3 VU | Noticeable warmth/color |
| > +6 VU | Heavy saturation/compression |

The peak LED is therefore an **analog saturation indicator**, not a digital clipping warning. It tells the user: "You're now driving the virtual analog stages into their sweet spot."

## Files

- `src/components/ui/VintageVuMeter.tsx` - Main component implementation
- `src/utils/dsp-math.ts` - Contains `linearToDb()` conversion function
