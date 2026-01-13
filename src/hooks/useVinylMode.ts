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
  targetPlaybackRate: number; // 0.733 for 33/45 ratio
  transitionDuration: number; // ms for spin up/down
  maxBufferDuration: number; // seconds before auto-exit
  reverbWet: number; // 0-1 reverb mix when active
  pitchShiftSemitones: number; // negative for lower pitch
}

const DEFAULT_CONFIG: VinylModeConfig = {
  targetPlaybackRate: 0.733, // 33⅓ / 45 ≈ 0.733
  transitionDuration: 1500, // Faster transition (was 2500ms)
  maxBufferDuration: 240, // 4 minutes
  reverbWet: 0.75, // 75% reverb when vinyl mode active
  pitchShiftSemitones: -4, // ~4 semitones down matches the speed ratio
};

interface UseVinylModeCallbacks {
  onRampPitch?: (semitones: number) => void;
  onRampReverb?: (wet: number) => void;
  onRampPlaybackRate?: (rate: number) => void;
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
    [
      config.targetPlaybackRate,
      config.transitionDuration,
      config.maxBufferDuration,
      config.reverbWet,
      config.pitchShiftSemitones,
    ],
  );

  const vinylMode = useAudioStore((state) => state.vinylMode);
  const setVinylModeState = useAudioStore((state) => state.setVinylModeState);
  const setVinylModeRemainingTime = useAudioStore(
    (state) => state.setVinylModeRemainingTime,
  );
  const setVinylModeActive = useAudioStore((state) => state.setVinylModeActive);

  /**
   * Ramp parameters to vinyl mode values
   * Web Audio API handles the smooth ramping internally
   */
  const rampToVinylMode = useCallback(() => {
    callbacks?.onRampPitch?.(0); // Pitch shift disabled for now
    callbacks?.onRampReverb?.(cfg.reverbWet); // Enable reverb at 80%
    callbacks?.onRampPlaybackRate?.(cfg.targetPlaybackRate);
  }, [cfg, callbacks]);

  /**
   * Ramp parameters back to normal
   * Web Audio API handles the smooth ramping internally
   */
  const rampToNormalMode = useCallback(() => {
    // Start ramps back to normal - Web Audio API will handle smooth transitions
    callbacks?.onRampPitch?.(0);
    callbacks?.onRampReverb?.(0);
    callbacks?.onRampPlaybackRate?.(1.0);
  }, [callbacks]);

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
    isTransitioning:
      vinylMode.state === "entering" || vinylMode.state === "exiting",
    activate,
    deactivate,
  };
};
