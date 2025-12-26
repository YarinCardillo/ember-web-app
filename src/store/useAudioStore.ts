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
  compThreshold: number; // dB
  compRatio: number;     // ratio
  compAttack: number;    // seconds
  compRelease: number;   // seconds
  outputGain: number;

  // Bypass states
  bypassToneStack: boolean;
  bypassSaturation: boolean;
  bypassCompressor: boolean;
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
      inputGain: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      presence: 0,
      drive: 0.3,
      harmonics: 0.5,
      saturationMix: 1.0,
      compThreshold: -24,
      compRatio: 4,
      compAttack: 0.003,
      compRelease: 0.25,
      outputGain: 0,
      bypassToneStack: false,
      bypassSaturation: false,
      bypassCompressor: false,
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
          compThreshold: preset.compThreshold ?? -24,
          compRatio: preset.compRatio ?? 4,
          compAttack: preset.compAttack ?? 0.003,
          compRelease: preset.compRelease ?? 0.25,
          inputGain: preset.inputGain ?? 0,
          outputGain: preset.outputGain ?? 0,
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
        compThreshold: state.compThreshold,
        compRatio: state.compRatio,
        compAttack: state.compAttack,
        compRelease: state.compRelease,
        outputGain: state.outputGain,
        inputDeviceId: state.inputDeviceId,
        outputDeviceId: state.outputDeviceId,
        bypassToneStack: state.bypassToneStack,
        bypassSaturation: state.bypassSaturation,
        bypassCompressor: state.bypassCompressor,
        bypassSpeakerSim: state.bypassSpeakerSim,
      }),
    }
  )
);
