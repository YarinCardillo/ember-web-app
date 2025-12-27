# Bug Report #001: Hard Clipper Activating at -6dB Instead of 0dB

**Status:** ✅ Fixed  
**Date Reported:** 2025-12-27  
**Date Fixed:** 2025-12-27  
**Affected Component:** `OutputNode.ts` - Hard Clipper WaveShaperNode  

---

## Symptom

Users reported audible clipping distortion even when the "Clipper" LED meter was showing yellow LEDs (around -6dB to -3dB range). The meter never reached the red LEDs (0dB+), yet the audio was clearly distorting.

### Expected Behavior
- Audio should pass through cleanly until it reaches 0dB (full scale)
- Hard clipping should only activate when signal exceeds ±1.0 (0dB)
- LED meter should show red only when clipping actually occurs

### Actual Behavior
- Audio was clipping at approximately -6dB
- LED meter correctly showed yellow (pre-clipping levels)
- The clipper was activating prematurely

---

## Root Cause Analysis

The bug was located in the `createHardClipCurve()` method of `OutputNode.ts`.

### The Problem

The `WaveShaperNode` in Web Audio API expects a curve array where:
- Index 0 maps to input value **-1.0**
- Index `samples-1` maps to input value **+1.0**

The original code was incorrectly mapping the input range:

```typescript
// ❌ INCORRECT - Maps to [-2, +2] range
const x = (i / (samples - 1)) * 4 - 2;
```

This meant:
- When input signal was at **0.5** (approximately -6dB), the curve lookup treated it as **1.0** (0dB)
- The clipper activated at half the intended amplitude
- Result: clipping started at -6dB instead of 0dB

### Visual Representation

```
Original (buggy) mapping:
  Array Index:     0 -------- 4095 -------- 8191
  Input Value:    -2.0        0.0         +2.0    ← Wrong!
  
  A signal at 0.5 linear was mapped to index ~6143
  Which corresponded to x = 1.0, triggering clipping

Correct mapping:
  Array Index:     0 -------- 4095 -------- 8191
  Input Value:    -1.0        0.0         +1.0    ← Correct!
  
  A signal at 0.5 linear is mapped to index ~6143
  Which correctly corresponds to x = 0.5, no clipping
```

---

## The Fix

Changed the curve generation formula to correctly map the array indices to the [-1, +1] range:

```typescript
// ✅ CORRECT - Maps to [-1, +1] range
const x = (i / (samples - 1)) * 2 - 1;
```

### Full Fixed Method

```typescript
private createHardClipCurve(): Float32Array {
  const samples = 8192;
  const curve = new Float32Array(samples);
  
  for (let i = 0; i < samples; i++) {
    // Map index to -1.0 to +1.0 range for Web Audio API
    const x = (i / (samples - 1)) * 2 - 1;  // ← Fixed formula
    
    // Hard clip at ±1.0 (0dB)
    if (x > 1.0) {
      curve[i] = 1.0;
    } else if (x < -1.0) {
      curve[i] = -1.0;
    } else {
      curve[i] = x;
    }
  }
  return curve;
}
```

---

## Debugging Process

1. **Initial hypothesis:** LED meter was measuring RMS instead of Peak
   - Added `mode` prop to `LEDMeter` component
   - Set Clipper meter to Peak mode
   - Issue persisted → hypothesis rejected

2. **Second hypothesis:** `WaveShaperNode` curve was misconfigured
   - Added instrumentation logging to `OutputNode.ts` constructor
   - Logged first/last 5 values of the curve array
   - Found curve was mapping to [-2, +2] instead of [-1, +1]
   - Fixed the formula → issue resolved

---

## Files Modified

| File | Change |
|------|--------|
| `src/audio/nodes/OutputNode.ts` | Fixed `createHardClipCurve()` mapping formula |
| `src/components/ui/LEDMeter.tsx` | Added `mode` prop for RMS/Peak selection (improvement) |

---

## Lessons Learned

1. **Web Audio API WaveShaperNode Curve Rules:**
   - The curve array maps input values from **-1.0 to +1.0**
   - Index 0 = input -1.0, last index = input +1.0
   - Always use: `x = (i / (samples - 1)) * 2 - 1`

2. **Debugging Audio Issues:**
   - Visual meters can help identify where in the chain a problem occurs
   - Add temporary logging to verify DSP curve/parameter values
   - Test with simple passthrough to isolate problematic nodes

3. **Testing Recommendations:**
   - Create a test that generates a -3dB sine wave and verifies no clipping
   - Create a test that generates a +3dB sine wave and verifies clipping activates
   - Log curve array samples during development to catch mapping errors early

---

## Related Documentation

- [Web Audio API WaveShaperNode](https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - OutputNode section
- [ARCHITECTURE.md - PWA Cache Management](./ARCHITECTURE.md#pwa-cache-management) - How to force cache clear for users after deploying fixes

