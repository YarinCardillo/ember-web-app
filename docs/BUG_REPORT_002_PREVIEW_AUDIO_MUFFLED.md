# Bug Report #002: Preview Audio Muffled/Dropout at Start

**Status:** ✅ Fixed
**Date Reported:** 2025-01-13
**Date Fixed:** 2025-01-13
**Affected Component:** `AmpRack.tsx` - Preview playback initialization

---

## Symptom

When clicking the Preview button, the audio would exhibit a distinctive three-phase behavior:

1. **Muffled audio** - Sound started but was attenuated/degraded
2. **Brief dropout** - Audio would cut out momentarily
3. **Normal playback** - Audio resumed at correct quality

This happened consistently on first preview play, and intermittently on subsequent plays.

### Expected Behavior
- Preview audio should start immediately at full quality
- No dropout or audio glitches

### Actual Behavior
- Audio quality ramped up over ~500ms
- Noticeable click/dropout during transition
- Issue more pronounced after page had been idle

---

## Root Cause Analysis

The bug was caused by a missing `AudioContext.resume()` call before starting preview playback.

### The Problem

Modern browsers implement an **autoplay policy** that suspends AudioContext until user interaction. Even after initial interaction, the context can return to suspended state after:
- Page being in background
- Device sleep/wake
- Audio output device changes
- Browser tab switching

The `togglePreview` function was calling `source.start()` immediately without ensuring the AudioContext was in "running" state:

```typescript
// ❌ INCORRECT - Context may be suspended
source.start();
setIsPreviewPlaying(true);
```

When AudioContext is suspended:
- `source.start()` schedules playback but audio doesn't actually play
- Context auto-resumes asynchronously (browser-dependent timing)
- Results in delayed/muffled start and audible transition when context activates

### Timeline of the Bug

```
User clicks Preview
    ↓
source.start() called
    ↓
AudioContext state = "suspended"
    ↓
Audio buffers but doesn't play (or plays muffled)
    ↓
~200-500ms later: Browser auto-resumes context
    ↓
Audio suddenly starts playing correctly
    ↓
User hears: muffled → dropout → normal
```

---

## The Fix

Added `await engine.resume()` before `source.start()` to ensure the AudioContext is active:

```typescript
// ✅ CORRECT - Ensure context is running before playback
await engine.resume();
source.start();
setIsPreviewPlaying(true);
```

### Location

`src/components/layout/AmpRack.tsx`, lines 770-774 in `togglePreview` callback.

### Why This Works

The `AudioEngine.resume()` method checks if context is suspended and awaits the resume:

```typescript
async resume(): Promise<void> {
  if (this.ctx && this.ctx.state === "suspended") {
    await this.ctx.resume();
  }
}
```

This pattern was already used elsewhere in the codebase (device change handler, line 832) but was missing from the preview initialization.

---

## Debugging Process

1. **Initial symptom analysis:**
   - "Muffled then clear" suggested initialization timing issue
   - "Dropout" suggested state transition

2. **Hypothesis:** AudioContext suspended state
   - Reviewed Web Audio API autoplay policy documentation
   - Found `resume()` call missing before `source.start()`

3. **Fix verification:**
   - Added `await engine.resume()` before playback
   - Tested: immediate clean audio on first click
   - Tested after idle: still works correctly

---

## Files Modified

| File                                    | Change                                          |
|-----------------------------------------|-------------------------------------------------|
| `src/components/layout/AmpRack.tsx`     | Added `await engine.resume()` before `source.start()` |

---

## Lessons Learned

1. **AudioContext State Management:**
   - Always call `resume()` before any playback operation
   - Don't assume context stays "running" after initial user interaction
   - Context can suspend due to device changes, background tabs, etc.

2. **Pattern to Follow:**
   ```typescript
   // Before ANY audio playback:
   await audioContext.resume();
   source.start();
   ```

3. **Common Suspension Triggers:**
   - Page load (autoplay policy)
   - Tab backgrounded for extended period
   - Device sleep/wake cycle
   - Audio output device change (especially on mobile)
   - Some browsers suspend after ~30s of silence

4. **Testing Recommendations:**
   - Test preview after letting page sit idle for 1+ minute
   - Test after switching tabs and returning
   - Test on mobile after screen lock/unlock
   - Test after plugging/unplugging headphones

---

## Related Documentation

- [Web Audio API AudioContext.state](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)
- [Autoplay Policy](https://developer.chrome.com/blog/autoplay/)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - AudioEngine section
