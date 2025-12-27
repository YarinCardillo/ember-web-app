/**
 * Zustand store for audio state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PresetConfig, AudioDeviceInfo } from '../types/audio.types';
import presets from '../audio/presets/amp-presets.json';

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
  drive: number;        // 0-1
  harmonics: number;    // 0-1
  saturationMix: number; // 0-1
  preGain: number;      // Pre-clipper gain in dB
  outputGain: number;   // Master volume in dB

  // Bypass states
  bypassAll: boolean;          // Master bypass - routes input directly to output
  bypassTapeSim: boolean;
  bypassToneStack: boolean;
  bypassSaturation: boolean;
  bypassSpeakerSim: boolean;

  // Presets
  currentPreset: string | null;

  // Actions
  setParameter: <K extends keyof AudioState>(param: K, value: AudioState[K]) => void;
  loadPreset: (preset: PresetConfig) => void;
  setInitialized: (initialized: boolean) => void;
  setRunning: (running: boolean) => void;
  setInputDevice: (deviceId: string | null) => void;
  setOutputDevice: (deviceId: string | null) => void;
  setAvailableDevices: (devices: AudioDeviceInfo[]) => void;
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
      outputGain: 0,  // Master volume starts at 0, not controlled by presets
      bypassAll: false,
      bypassTapeSim: STARTER_PRESET.bypassTapeSim ?? false,
      bypassToneStack: STARTER_PRESET.bypassToneStack ?? false,
      bypassSaturation: STARTER_PRESET.bypassSaturation ?? false,
      bypassSpeakerSim: true,  // Speaker sim always bypassed by default (no IR)
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
          // outputGain is NOT modified by presets - user's master volume setting is preserved
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
    }),
    {
      name: 'ember-amp-storage',
      partialize: (state) => ({
        inputGain: state.inputGain,
        bass: state.bass,
        mid: state.mid,
        treble: state.treble,
        presence: state.presence,
        drive: state.drive,
        harmonics: state.harmonics,
        saturationMix: state.saturationMix,
        outputGain: state.outputGain,
        inputDeviceId: state.inputDeviceId,
        outputDeviceId: state.outputDeviceId,
        bypassAll: state.bypassAll,
        bypassTapeSim: state.bypassTapeSim,
        bypassToneStack: state.bypassToneStack,
        bypassSaturation: state.bypassSaturation,
        bypassSpeakerSim: state.bypassSpeakerSim,
      }),
    }
  )
);
