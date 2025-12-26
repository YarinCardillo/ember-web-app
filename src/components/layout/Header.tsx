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
  const bypassAll = useAudioStore((state) => state.bypassAll);
  const setParameter = useAudioStore((state) => state.setParameter);

  const handlePresetSelect = (_presetId: string, preset: typeof presets[string]): void => {
    loadPreset(preset);
  };

  const handleBypassToggle = (): void => {
    setParameter('bypassAll', !bypassAll);
  };

  return (
    <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
      {/* Logo/Title */}
      <div className="flex items-center gap-3">
        <img 
          src="/ember_app_icon.png" 
          alt="Ember Amp" 
          className="w-28 h-28 rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-ember-orange tracking-tight">
            EMBER AMP
          </h1>
          <p className="text-xs text-text-light opacity-60">
            HiFi Amplifier DSP
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

        {/* Master Bypass Button */}
        <button
          onClick={handleBypassToggle}
          disabled={!isRunning}
          className={`
            px-4 py-3 rounded-lg font-semibold transition-all duration-300
            flex items-center gap-2 border-2
            ${!isRunning
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : bypassAll
                ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 text-white shadow-lg shadow-yellow-600/30'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-300'
            }
          `}
          title="Bypass all processing to hear dry signal"
        >
          {/* Bypass LED indicator */}
          <div
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${bypassAll && isRunning
                ? 'bg-yellow-300 shadow-lg shadow-yellow-300/50 animate-pulse'
                : 'bg-gray-500'
              }
            `}
          />
          Bypass
        </button>

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
