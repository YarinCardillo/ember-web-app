/**
 * Header - Application header with title and controls
 */

import { PresetSelector } from '../ui/PresetSelector';
import { useAudioStore } from '../../store/useAudioStore';
import type { PresetCollection } from '../../types/audio.types';

interface HeaderProps {
  presets: PresetCollection;
  onPowerToggle: () => void;
}

export function Header({ presets, onPowerToggle }: HeaderProps): JSX.Element {
  const isRunning = useAudioStore((state) => state.isRunning);
  const currentPreset = useAudioStore((state) => state.currentPreset);
  const loadPreset = useAudioStore((state) => state.loadPreset);

  const handlePresetSelect = (_presetId: string, preset: typeof presets[string]): void => {
    loadPreset(preset);
  };

  return (
    <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
      {/* Logo/Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-ember-orange to-amber-glow rounded-lg flex items-center justify-center">
          <span className="text-2xl">🔥</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ember-orange tracking-tight">
            Ember Amp Web
          </h1>
          <p className="text-xs text-text-light opacity-60">
            HiFi Amplifier Simulator
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Preset Selector */}
        <PresetSelector
          presets={presets}
          currentPreset={currentPreset}
          onSelect={handlePresetSelect}
        />

        {/* Power Button */}
        <button
          onClick={onPowerToggle}
          className={`
            px-6 py-3 rounded-lg font-semibold transition-all duration-300
            flex items-center gap-2
            ${isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
              : 'bg-ember-orange hover:bg-amber-glow text-white shadow-lg shadow-ember-orange/30'
            }
          `}
        >
          {/* Power LED indicator */}
          <div
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${isRunning
                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                : 'bg-gray-500'
              }
            `}
          />
          {isRunning ? 'Power Off' : 'Power On'}
        </button>
      </div>
    </header>
  );
}
