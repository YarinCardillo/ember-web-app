/**
 * Header - Application header with title and controls
 */

import { useMemo } from 'react';
import { PresetSelector } from '../ui/PresetSelector';
import { useAudioStore } from '../../store/useAudioStore';
import { isMobileDevice } from '../../utils/device-detection';
import type { PresetCollection } from '../../types/audio.types';

interface HeaderProps {
  presets: PresetCollection;
  onPowerToggle: () => void;
  onHelpClick?: () => void;
}

export function Header({ presets, onPowerToggle, onHelpClick }: HeaderProps): JSX.Element {
  // Detect mobile once on mount (user agent doesn't change during session)
  const isMobile = useMemo(() => isMobileDevice(), []);
  
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
    <header className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 pb-4 border-b border-gray-800 gap-4">
      {/* Logo/Title */}
      <div className="flex items-center gap-3">
        <img 
          src="/ember_app_icon.png" 
          alt="Ember Amp" 
          className="w-16 h-16 md:w-28 md:h-28 rounded-lg"
          loading="eager"
          fetchPriority="high"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-ember-orange to-amber-glow bg-clip-text text-transparent">
                EMBER
              </span>
              <span className="text-white ml-2 md:ml-3">AMP</span>
            </h1>
            <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-semibold bg-ember-orange/20 text-ember-orange border border-ember-orange/40 rounded-full uppercase tracking-wider">
              Beta
            </span>
          </div>
          <p className="text-xs md:text-2xs text-text-light opacity-60">
            HiFi Amplifier DSP
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
        {/* Help Button */}
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="
              w-10 h-10 md:w-12 md:h-12 rounded-full transition-all duration-300
              bg-gray-800 hover:bg-gray-700 border border-gray-700
              text-gray-400 hover:text-ember-orange
              flex items-center justify-center
              text-lg md:text-xl font-light
            "
            title="Setup Guide"
          >
            ?
          </button>
        )}

        {/* Preset Selector */}
        <PresetSelector
          presets={presets}
          currentPreset={currentPreset}
          onSelect={handlePresetSelect}
        />

        {/* Bypass + Power group - stays together on wrap */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Master Bypass Button */}
          <button
            onClick={handleBypassToggle}
            disabled={!isRunning}
            className={`
              px-3 py-2 md:px-4 md:py-3 rounded-lg font-semibold transition-all duration-300
              flex items-center gap-2 border-2 text-sm md:text-base
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

          {/* Power Button - enabled on mobile for preview */}
          <button
            onClick={onPowerToggle}
            className={`
              px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-all duration-300
              flex items-center gap-2 text-sm md:text-base
              ${isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                : 'bg-ember-orange hover:bg-amber-glow text-white shadow-lg shadow-ember-orange/30'
              }
            `}
            title={isMobile ? 'Power on to use Preview' : undefined}
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
      </div>
    </header>
  );
}
