/**
 * useVinylMode - Hook to manage vinyl mode state transitions
 *
 * This hook coordinates the state machine and provides callbacks for
 * audio parameter ramps. The actual audio nodes are controlled via
 * callbacks passed from AmpRack.
 */

import { useCallback, useMemo } from "react";
import { useAudioStore } from "../store/useAudioStore";

interface VinylModeConfig {
  transitionDuration: number; // ms for spin up/down
  maxBufferDuration: number; // seconds before auto-exit
  reverbWet: number; // 0-1 reverb mix when active
}

const DEFAULT_CONFIG: VinylModeConfig = {
  transitionDuration: 1500, // Faster transition (was 2500ms)
  maxBufferDuration: 240, // 4 minutes
  reverbWet: 0.75, // 75% reverb when vinyl mode active
};

interface UseVinylModeCallbacks {
  onRampReverb?: (wet: number) => void;
  onRampIntensity?: (intensity: number) => void;
  onSetIntensity?: (intensity: number) => void;
  onFlushBuffer?: () => void;
}

/**
 * Hook to manage vinyl mode audio processing
 */
export const useVinylMode = (
  config: Partial<VinylModeConfig> = {},
  callbacks?: UseVinylModeCallbacks,
) => {
  const cfg = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.transitionDuration, config.maxBufferDuration, config.reverbWet],
  );

  const vinylMode = useAudioStore((state) => state.vinylMode);
  const setVinylModeState = useAudioStore((state) => state.setVinylModeState);
  const setVinylModeRemainingTime = useAudioStore(
    (state) => state.setVinylModeRemainingTime,
  );
  const setVinylModeActive = useAudioStore((state) => state.setVinylModeActive);
  const setVinylIntensity = useAudioStore((state) => state.setVinylIntensity);

  /**
   * Ramp parameters to vinyl mode values
   * Web Audio API handles the smooth ramping internally
   */
  const rampToVinylMode = useCallback(() => {
    callbacks?.onRampReverb?.(cfg.reverbWet);
    callbacks?.onRampIntensity?.(vinylMode.intensity);
  }, [cfg, callbacks, vinylMode.intensity]);

  /**
   * Ramp parameters back to normal
   * Web Audio API handles the smooth ramping internally
   */
  const rampToNormalMode = useCallback(() => {
    callbacks?.onRampReverb?.(0);
    callbacks?.onRampIntensity?.(0); // Ramp to no slowdown (rate = 1.0)
  }, [callbacks]);

  /**
   * Update intensity in real-time (when slider changes during active mode)
   */
  const updateIntensity = useCallback(
    (intensity: number) => {
      setVinylIntensity(intensity);
      if (vinylMode.isActive) {
        callbacks?.onSetIntensity?.(intensity);
      }
    },
    [vinylMode.isActive, setVinylIntensity, callbacks],
  );

  /**
   * Activate vinyl mode
   */
  const activate = useCallback(() => {
    if (vinylMode.state !== "idle") return;

    setVinylModeState("entering");
    rampToVinylMode();

    setTimeout(() => {
      setVinylModeState("active");
      setVinylModeActive(true);
      setVinylModeRemainingTime(cfg.maxBufferDuration);
    }, cfg.transitionDuration);
  }, [
    vinylMode.state,
    cfg,
    rampToVinylMode,
    setVinylModeState,
    setVinylModeActive,
    setVinylModeRemainingTime,
  ]);

  /**
   * Deactivate vinyl mode
   */
  const deactivate = useCallback(() => {
    if (vinylMode.state !== "active") return;

    setVinylModeState("exiting");
    // Don't flush buffer - let it drain naturally as playback rate increases to 1.0
    // This creates a smoother transition without audio dropout
    rampToNormalMode();

    setTimeout(() => {
      setVinylModeState("idle");
      setVinylModeActive(false);
      setVinylModeRemainingTime(cfg.maxBufferDuration);
      // Flush buffer AFTER transition completes and we're back to bypass mode
      callbacks?.onFlushBuffer?.();
    }, cfg.transitionDuration);
  }, [
    vinylMode.state,
    cfg,
    callbacks,
    rampToNormalMode,
    setVinylModeState,
    setVinylModeActive,
    setVinylModeRemainingTime,
  ]);

  return {
    state: vinylMode.state,
    remainingTime: vinylMode.remainingTime,
    isActive: vinylMode.isActive,
    intensity: vinylMode.intensity,
    updateIntensity,
    isTransitioning:
      vinylMode.state === "entering" || vinylMode.state === "exiting",
    activate,
    deactivate,
  };
};
