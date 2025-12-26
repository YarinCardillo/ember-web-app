/**
 * Zustand store for audio state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PresetConfig, AudioDeviceInfo } from '../types/audio.types';

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
  outputGain: number;

  // Bypass states
  bypassAll: boolean;          // Master bypass - routes input directly to output
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
      // Initial state
      isInitialized: false,
      isRunning: false,
      inputDeviceId: null,
      outputDeviceId: null,
      availableDevices: [],
      inputGain: -6,
      bass: 0,
      mid: 0,
      treble: 0,
      presence: 0,
      drive: 0.3,
      harmonics: 0.5,
      saturationMix: 0.6,
      outputGain: 0,
      bypassAll: false,
      bypassToneStack: false,
      bypassSaturation: false,
      bypassSpeakerSim: true, // Bypassed by default (no IR loaded)
      currentPreset: null,

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
          outputGain: preset.outputGain ?? 0,
          // Module activation (default to active if not specified)
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
        bypassToneStack: state.bypassToneStack,
        bypassSaturation: state.bypassSaturation,
        bypassSpeakerSim: state.bypassSpeakerSim,
      }),
    }
  )
);
