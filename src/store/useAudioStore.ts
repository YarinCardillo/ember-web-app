/**
 * Zustand store for audio state management
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PresetConfig, AudioDeviceInfo } from "../types/audio.types";
import presets from "../audio/presets/amp-presets.json";

const STARTER_PRESET = presets.starter as PresetConfig;

interface AudioState {
  // Status
  isInitialized: boolean;
  isRunning: boolean;
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  availableDevices: AudioDeviceInfo[];

  // Parameters (all in dB where applicable)
  inputGain: number;
  bass: number;
  mid: number;
  treble: number;
  presence: number;
  drive: number; // 0-1
  harmonics: number; // 0-1
  saturationMix: number; // 0-1
  preGain: number; // Pre-clipper gain in dB

  // Transient shaper parameters (for debug)
  transientAttack: number; // -1.0 to +1.0
  transientSustain: number; // -1.0 to +1.0
  transientMix: number; // 0.0 to 1.0

  // Bypass states
  bypassAll: boolean; // Master bypass - routes input directly to output
  bypassTapeSim: boolean;
  bypassToneStack: boolean;
  bypassSaturation: boolean;
  bypassTransient: boolean;
  bypassSpeakerSim: boolean;

  // Vinyl mode state
  vinylMode: {
    isActive: boolean;
    remainingTime: number; // seconds
    state: "idle" | "entering" | "active" | "exiting";
    intensity: number; // 0.0 to 1.0, default 0.3
  };

  // Presets
  currentPreset: string | null;

  // Actions
  setParameter: <K extends keyof AudioState>(
    param: K,
    value: AudioState[K],
  ) => void;
  loadPreset: (preset: PresetConfig) => void;
  setInitialized: (initialized: boolean) => void;
  setRunning: (running: boolean) => void;
  setInputDevice: (deviceId: string | null) => void;
  setOutputDevice: (deviceId: string | null) => void;
  setAvailableDevices: (devices: AudioDeviceInfo[]) => void;
  setVinylModeState: (
    state: "idle" | "entering" | "active" | "exiting",
  ) => void;
  setVinylModeRemainingTime: (time: number) => void;
  setVinylModeActive: (active: boolean) => void;
  setVinylIntensity: (intensity: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      // Initial state - loaded from STARTER_PRESET (single source of truth)
      isInitialized: false,
      isRunning: false,
      inputDeviceId: null,
      outputDeviceId: null,
      availableDevices: [],
      inputGain: STARTER_PRESET.inputGain ?? 0,
      bass: STARTER_PRESET.bass,
      mid: STARTER_PRESET.mid,
      treble: STARTER_PRESET.treble,
      presence: STARTER_PRESET.presence,
      drive: STARTER_PRESET.drive,
      harmonics: STARTER_PRESET.harmonics ?? 0.4,
      saturationMix: STARTER_PRESET.saturationMix ?? 0.6,
      preGain: STARTER_PRESET.preGain ?? 0,
      transientAttack: 0.75, // Default: 75% (optimal)
      transientSustain: 0.0, // Default: 0% (optimal)
      transientMix: 0.55, // Default: 55% (optimal)
      bypassAll: false,
      bypassTapeSim: STARTER_PRESET.bypassTapeSim ?? false,
      bypassToneStack: STARTER_PRESET.bypassToneStack ?? false,
      bypassSaturation: STARTER_PRESET.bypassSaturation ?? false,
      bypassTransient: false,
      bypassSpeakerSim: true, // Speaker sim always bypassed by default (no IR)
      vinylMode: {
        isActive: false,
        remainingTime: 240, // 4 minutes in seconds
        state: "idle",
        intensity: 0.3, // Default: 0.3 (~-8% speed, sweet spot for "slowed & reverb")
      },
      currentPreset: STARTER_PRESET.name,

      // Actions
      setParameter: (param, value) => {
        set({ [param]: value });
      },

      loadPreset: (preset) => {
        set({
          bass: preset.bass,
          mid: preset.mid,
          treble: preset.treble,
          presence: preset.presence,
          drive: preset.drive,
          harmonics: preset.harmonics ?? 0.5,
          saturationMix: preset.saturationMix ?? 1.0,
          inputGain: preset.inputGain ?? -6,
          preGain: preset.preGain ?? 0,
          // Module activation (default to active if not specified)
          bypassTapeSim: preset.bypassTapeSim ?? true, // Default to inactive in presets
          bypassToneStack: preset.bypassToneStack ?? false,
          bypassSaturation: preset.bypassSaturation ?? false,
          currentPreset: preset.name,
        });
      },

      setInitialized: (initialized) => {
        set({ isInitialized: initialized });
      },

      setRunning: (running) => {
        set({ isRunning: running });
      },

      setInputDevice: (deviceId) => {
        set({ inputDeviceId: deviceId });
      },

      setOutputDevice: (deviceId) => {
        set({ outputDeviceId: deviceId });
      },

      setAvailableDevices: (devices) => {
        set({ availableDevices: devices });
      },

      setVinylModeState: (state) => {
        set((prev) => ({
          vinylMode: { ...prev.vinylMode, state },
        }));
      },

      setVinylModeRemainingTime: (time) => {
        set((prev) => ({
          vinylMode: { ...prev.vinylMode, remainingTime: time },
        }));
      },

      setVinylModeActive: (active) => {
        set((prev) => ({
          vinylMode: { ...prev.vinylMode, isActive: active },
        }));
      },

      setVinylIntensity: (intensity) => {
        set((prev) => ({
          vinylMode: { ...prev.vinylMode, intensity },
        }));
      },
    }),
    {
      name: "ember-amp-storage",
      partialize: (state) => ({
        inputGain: state.inputGain,
        bass: state.bass,
        mid: state.mid,
        treble: state.treble,
        presence: state.presence,
        drive: state.drive,
        harmonics: state.harmonics,
        saturationMix: state.saturationMix,
        inputDeviceId: state.inputDeviceId,
        outputDeviceId: state.outputDeviceId,
        bypassAll: state.bypassAll,
        bypassTapeSim: state.bypassTapeSim,
        bypassToneStack: state.bypassToneStack,
        bypassSaturation: state.bypassSaturation,
        bypassTransient: state.bypassTransient,
        bypassSpeakerSim: state.bypassSpeakerSim,
        vinylIntensity: state.vinylMode.intensity,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AudioState> & {
          vinylIntensity?: number;
        };
        return {
          ...currentState,
          ...persisted,
          vinylMode: {
            ...currentState.vinylMode,
            intensity:
              persisted.vinylIntensity ?? currentState.vinylMode.intensity,
          },
        };
      },
    },
  ),
);
