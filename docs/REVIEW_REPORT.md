# Ember Amp Code Review Report

**Review Date:** 2026-01-13
**Reviewer:** Claude (Opus 4.5)
**Branch:** claude/review-rules-R9z71

---

## Executive Summary

Ember Amp is a well-architected browser-based audio processing application demonstrating solid understanding of the Web Audio API and modern React patterns. The codebase shows professional organization with clear separation between audio processing, state management, and UI components.

**Strengths:**
- Clean audio node abstraction pattern
- Proper AudioWorklet usage for real-time DSP
- Good state management with Zustand
- Thoughtful UX with safety warnings for microphone selection
- Well-documented README and architecture docs

**Areas for Improvement:**
- Several DSP issues that could cause audio glitches
- Performance optimizations needed in metering components
- Some components exceed recommended size limits
- Missing error boundaries and edge case handling

**Overall Assessment:** Production-ready with minor refinements needed. The identified issues range from quick fixes to moderate refactoring efforts.

---

## Findings by Priority

### CRITICAL - Issues that cause bugs, crashes, or audio glitches

#### 1. OutputNode Hard Clipper is Non-Functional

**File:** `src/audio/nodes/OutputNode.ts:55-70`

**Problem:** The hard clipper curve is an identity function (`curve[i] = x`) that doesn't actually clip. The WaveShaper naturally clips at boundaries but the explicit curve provides no additional limiting.

**Why it matters:** The output protection circuit documented as "hard clips at 0dB" doesn't actually provide hard limiting. Signals above 0dB pass through unaffected, potentially causing DAC clipping.

**Fix:**
```typescript
private createHardClipCurve(): Float32Array {
  const samples = 65537;
  const curve = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    // Actual hard clip at ±1.0
    curve[i] = Math.max(-1, Math.min(1, x));
  }

  return curve;
}
```

**Effort:** Quick fix

---

#### 2. Missing Denormal Prevention in Transient Processor

**File:** `public/worklets/transient.worklet.js:116-124`

**Problem:** The envelope follower uses recursive filters without denormal prevention. When processing very quiet signals, denormal floats can cause CPU spikes.

**Why it matters:** Real-time audio processing suffers severe performance degradation when denormal floats are encountered, causing audio dropouts on some systems.

**Fix:**
```javascript
updateEnvelope(input, currentEnv, attackCoeff, releaseCoeff) {
  const DC_OFFSET = 1e-25; // Prevent denormals
  const adjusted = input + DC_OFFSET;

  if (adjusted > currentEnv) {
    return currentEnv + attackCoeff * (adjusted - currentEnv);
  } else {
    return currentEnv + releaseCoeff * (adjusted - currentEnv);
  }
}
```

**Effort:** Quick fix

---

#### 3. Pitch Shifter Artifacts Due to Simplified Implementation

**File:** `public/worklets/pitch-shifter.worklet.js`

**Problem:** The granular synthesis implementation is simplified with several issues:
- `generateGrains()` is called every `process()` without regard to hop timing
- Output buffer decay (`*= 0.5` at line 106) causes volume inconsistency
- No proper grain scheduling leads to audible artifacts

**Why it matters:** Users will hear clicks, volume pumping, and pitch artifacts during vinyl mode transitions.

**Fix:** Implement proper grain scheduling with hop counter:
```javascript
process(inputs, outputs, parameters) {
  // ... existing code ...

  this.hopCounter += blockSize;
  if (this.hopCounter >= this.hopSize) {
    this.generateGrains();
    this.hopCounter -= this.hopSize;
  }

  return true;
}
```

**Effort:** Medium - requires algorithm refinement

---

#### 4. VinylBuffer Large Memory Allocation

**File:** `public/worklets/vinyl-buffer.worklet.js:17-23`

**Problem:** Allocates ~28MB (180 seconds * 48000 samples * 2 channels * 4 bytes) at initialization. This happens synchronously in the AudioWorklet constructor.

**Why it matters:** Large synchronous allocations can cause audio glitches during initialization and increase memory pressure on mobile devices.

**Fix:** Consider lazy allocation or smaller initial buffer with dynamic growth:
```javascript
constructor() {
  super();
  // Start with 30 seconds, grow if needed
  this.maxBufferSeconds = 30;
  this.bufferSize = Math.floor(sampleRate * this.maxBufferSeconds);
  // ...
}
```

**Effort:** Medium

---

### HIGH - Performance problems or patterns that will cause issues at scale

#### 5. useAudioAnalyser Triggers 60fps Re-renders

**File:** `src/hooks/useAudioAnalyser.ts:37-59`

**Problem:** Calls `setData()` on every animation frame (~60fps), causing unnecessary React re-renders for all consuming components.

**Why it matters:** Each setState triggers React reconciliation. With multiple meters using this hook, performance degrades significantly.

**Fix:** Use refs for animation data, only setState when values change significantly:
```typescript
export function useAudioAnalyser(analyser: AnalyserNode | null): AnalyserData {
  const dataRef = useRef<AnalyserData>({ rms: 0, peak: 0, rmsDb: -Infinity, peakDb: -Infinity });
  const [, forceUpdate] = useState(0);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    // ... setup ...
    const update = (): void => {
      animationFrameRef.current = requestAnimationFrame(update);
      // ... calculate values ...

      // Only trigger re-render every 50ms or on significant change
      const now = performance.now();
      if (now - lastUpdateRef.current > 50 || Math.abs(rmsDb - dataRef.current.rmsDb) > 1) {
        dataRef.current = { rms, peak, rmsDb, peakDb };
        lastUpdateRef.current = now;
        forceUpdate(n => n + 1);
      }
    };
    // ...
  }, [analyser]);

  return dataRef.current;
}
```

**Effort:** Medium

---

#### 6. AmpRack.tsx Exceeds Size Limits (893 lines)

**File:** `src/components/layout/AmpRack.tsx`

**Problem:** Component is 893 lines, far exceeding the 300-line maximum from .claude/rules. It handles:
- Audio initialization
- Device enumeration
- Preview playback
- Vinyl mode orchestration
- Signal chain management
- Safety modal state

**Why it matters:** Violates Single Responsibility Principle, making testing and maintenance difficult.

**Fix:** Extract into smaller modules:
- `useAudioChain.ts` - Audio node creation and connection
- `useDeviceManager.ts` - Device enumeration and selection
- `usePreviewPlayer.ts` - Preview audio loading and playback
- Keep AmpRack as orchestration layer only

**Effort:** Significant refactor

---

#### 7. ToneStackNode Parameter Changes Cause Clicks

**File:** `src/audio/nodes/ToneStackNode.ts:55-78`

**Problem:** EQ gain changes are applied immediately (`this.bassFilter.gain.value = db`) without ramping, causing audible clicks.

**Why it matters:** Abrupt parameter changes cause digital artifacts in real-time audio.

**Fix:**
```typescript
setBass(db: number): void {
  const ctx = this.bassFilter.context as AudioContext;
  this.bassFilter.gain.setTargetAtTime(db, ctx.currentTime, 0.01);
}
```

**Effort:** Quick fix (apply to all 4 bands)

---

#### 8. Multiple Individual Store Subscriptions

**File:** `src/components/layout/AmpRack.tsx:335-349`

**Problem:** 15+ individual `useAudioStore()` calls create separate subscriptions, each triggering re-renders when their value changes.

**Why it matters:** Unnecessary re-renders impact performance, especially during audio parameter automation.

**Fix:** Use selector grouping:
```typescript
const audioParams = useAudioStore(useCallback(
  (state) => ({
    inputGain: state.inputGain,
    bass: state.bass,
    mid: state.mid,
    treble: state.treble,
    presence: state.presence,
    drive: state.drive,
    harmonics: state.harmonics,
    saturationMix: state.saturationMix,
    preGain: state.preGain,
    outputGain: state.outputGain,
  }),
  []
));
```

**Effort:** Medium

---

#### 9. Missing Cleanup for Preview Audio Fetch

**File:** `src/components/layout/AmpRack.tsx:641-658`

**Problem:** `loadPreviewBuffer()` fetch has no AbortController for cleanup. If component unmounts during fetch, the promise resolves to a stale reference.

**Why it matters:** Memory leaks and potential errors when accessing unmounted component state.

**Fix:**
```typescript
const loadPreviewBuffer = useCallback(async (signal?: AbortSignal): Promise<AudioBuffer | null> => {
  if (previewBufferRef.current) return previewBufferRef.current;

  try {
    const response = await fetch('/audio/assumptions.mp3', { signal });
    if (!response.ok) throw new Error('Failed to fetch');
    // ...
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    // ...
  }
}, []);
```

**Effort:** Quick fix

---

#### 10. VintageVuMeter Missing RAF Cleanup on Prop Change

**File:** `src/components/ui/VintageVuMeter.tsx:92-189`

**Problem:** When `analyser` prop changes from a valid node to null, the cleanup runs but refs (`peakBrightnessRef`, `currentAngleRef`) retain stale values. When a new analyser is provided, these stale values cause visual jumps.

**Why it matters:** Visual glitches when switching audio sources.

**Fix:** Reset refs in cleanup:
```typescript
return () => {
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  currentAngleRef.current = minAngle;
  peakBrightnessRef.current = 0;
};
```

**Effort:** Quick fix

---

### MEDIUM - Code quality issues and non-standard patterns

#### 11. Empty Catch Blocks with ESLint Disables

**File:** `src/audio/nodes/VinylModeNode.ts:176-178, 204-206, 214-217, 239-242`

**Problem:** Multiple empty catch blocks with `// eslint-disable-next-line no-empty` comments. Silently swallowing errors makes debugging difficult.

**Why it matters:** Violates "No silent failures" from .claude/rules.

**Fix:** Log or handle the errors:
```typescript
try {
  this.inputGain.connect(this.bypassGain);
} catch (err) {
  // Connection already exists - safe to ignore
  console.debug('[VinylModeNode] Bypass already connected');
}
```

**Effort:** Quick fix

---

#### 12. Magic Numbers in DSP Code

**Files:** Multiple worklets and audio nodes

**Problem:** Undocumented numeric constants throughout:
- `REFERENCE_LINEAR = 0.12589254117941673` (tube-saturation.worklet.js:17)
- `PRE_SAT_GAIN = 4.0` (TapeSimNode.ts:14)
- `0.733` vinyl ratio (multiple files)
- `65537` curve samples (multiple files)

**Why it matters:** Makes code harder to understand and maintain.

**Fix:** Add documentation comments:
```javascript
// Reference level: -18 dBFS (0 VU) in linear amplitude
// Formula: 10^(-18/20) ≈ 0.126
const REFERENCE_LINEAR = 0.12589254117941673;

// WaveShaper curve resolution: 2^16 + 1 for odd symmetry
const CURVE_SAMPLES = 65537;
```

**Effort:** Quick fix

---

#### 13. Inline Styles in VintageVuMeter

**File:** `src/components/ui/VintageVuMeter.tsx`

**Problem:** Heavy use of inline `style={{}}` objects instead of Tailwind classes. Each render creates new style objects.

**Why it matters:** Inconsistent with codebase styling approach, creates unnecessary object allocations.

**Fix:** Move static styles to CSS/Tailwind, memoize dynamic styles:
```typescript
const needleStyle = useMemo(() => ({
  transform: `translateX(-50%) rotate(${currentAngle}deg)`,
}), [currentAngle]);
```

**Effort:** Medium

---

#### 14. setParameter Store Action Lacks Type Safety

**File:** `src/store/useAudioStore.ts:110-112`

**Problem:** Generic `setParameter` allows setting any key with any value:
```typescript
setParameter: (param, value) => {
  set({ [param]: value });
}
```

**Why it matters:** No compile-time type checking for parameter/value pairs.

**Fix:** Create specific setters for parameter groups or use discriminated unions:
```typescript
setAudioParam: (param: AudioParamKey, value: number) => void;
setBypassState: (param: BypassKey, value: boolean) => void;
```

**Effort:** Medium

---

#### 15. Missing Error Boundaries

**File:** `src/App.tsx` and component tree

**Problem:** No React Error Boundaries. AudioWorklet failures or audio context errors will crash the entire app.

**Why it matters:** Poor user experience when errors occur; entire UI becomes unresponsive.

**Fix:** Add error boundary wrapper:
```tsx
<ErrorBoundary fallback={<AudioErrorFallback />}>
  <AmpRack />
</ErrorBoundary>
```

**Effort:** Medium

---

#### 16. Unused Pitch Shifter in Vinyl Mode

**File:** `src/audio/nodes/VinylModeNode.ts:77-80, 252-275`

**Problem:** PitchShifter worklet is created and connected but never actually used (`callbacks?.onRampPitch?.(0)` always sets to 0).

**Why it matters:** Unnecessary CPU overhead and memory for unused processor.

**Fix:** Either implement proper pitch shifting or remove the unused code.

**Effort:** Quick fix (removal) or Medium (implementation)

---

### LOW - Suggestions and nice-to-haves

#### 17. Legacy File Should Be Removed

**File:** `src/components/ui/TapeReel_old.tsx`

**Problem:** Old component file kept alongside current `TapeReel.tsx`.

**Why it matters:** Clutters codebase, potential confusion.

**Fix:** Delete `TapeReel_old.tsx`

**Effort:** Quick fix

---

#### 18. Missing JSDoc on Public APIs

**Files:** Most TypeScript files

**Problem:** Public methods lack comprehensive JSDoc documentation per .claude/rules.

**Why it matters:** Reduces code discoverability and IDE support.

**Fix:** Add JSDoc to all public methods:
```typescript
/**
 * Set input gain level
 * @param db - Gain in decibels (-36 to +36)
 * @throws {RangeError} If db is outside valid range
 */
setGain(db: number): void {
```

**Effort:** Medium (gradual improvement)

---

#### 19. Accessibility Improvements Needed

**Files:** Various UI components

**Problem:** While `Knob.tsx` has good ARIA support, other components lack:
- Missing `aria-label` on toggle buttons
- VU meter not announced to screen readers
- Keyboard navigation incomplete in some areas

**Why it matters:** Accessibility compliance and inclusive design.

**Fix:** Add ARIA attributes:
```tsx
<button
  aria-label={`${isActive ? 'Disable' : 'Enable'} tape simulation`}
  aria-pressed={isActive}
  // ...
>
```

**Effort:** Medium

---

#### 20. Documentation Inconsistencies

**Files:** `README.md`, `docs/*.md`

**Issues:**
- README mentions `VUMeter.tsx` and `LEDMeter.tsx` but actual files are `VintageVuMeter.tsx`, `StereoMeter.tsx`, `OutputMeter.tsx`
- README mentions `VinylModeButton.tsx` but file is `VinylButton.tsx`
- Signal flow diagram doesn't show speaker sim node position
- `docs/` folder missing README index

**Fix:** Update documentation to match actual file names.

**Effort:** Quick fix

---

## Recommended Action Plan

### Phase 1: Critical Fixes (Immediate)

1. Fix OutputNode hard clipper curve
2. Add denormal prevention to transient processor
3. Fix ToneStackNode parameter ramping

### Phase 2: Performance (This Week)

4. Refactor useAudioAnalyser to reduce re-renders
5. Add AbortController to preview fetch
6. Fix VintageVuMeter ref cleanup
7. Consolidate store subscriptions in AmpRack

### Phase 3: Code Quality (Next Sprint)

8. Refactor AmpRack into smaller modules
9. Document magic numbers in DSP code
10. Replace empty catch blocks with proper handling
11. Add Error Boundaries

### Phase 4: Polish (Backlog)

12. Remove legacy files
13. Improve accessibility
14. Update documentation
15. Add JSDoc comments

---

## Estimated Effort Summary

| Priority | Count | Quick Fix | Medium | Significant |
|----------|-------|-----------|--------|-------------|
| Critical | 4     | 2         | 2      | 0           |
| High     | 6     | 2         | 3      | 1           |
| Medium   | 6     | 3         | 3      | 0           |
| Low      | 4     | 2         | 2      | 0           |
| **Total**| **20**| **9**     | **10** | **1**       |

---

## Appendix: Files Reviewed

### Audio Engine
- `src/audio/AudioEngine.ts`
- `src/audio/nodes/*.ts` (all 8 node files)
- `public/worklets/*.js` (all 5 worklet files)

### State Management
- `src/store/useAudioStore.ts`

### Components
- `src/components/layout/AmpRack.tsx`
- `src/components/ui/Knob.tsx`
- `src/components/ui/VintageVuMeter.tsx`

### Hooks
- `src/hooks/useAudioAnalyser.ts`
- `src/hooks/useVinylMode.ts`

### Utilities
- `src/utils/dsp-math.ts`

### Types
- `src/types/audio.types.ts`

### Configuration
- `.claude/rules`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`

### Documentation
- `README.md`
- `docs/*.md`

---

*Report generated following .claude/rules coding standards.*
