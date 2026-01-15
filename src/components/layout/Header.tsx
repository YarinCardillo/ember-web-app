/**
 * Header - Premium application header with title and controls
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { PresetSelector } from "../ui/PresetSelector";
import { useAudioStore } from "../../store/useAudioStore";
import { isMobileDevice } from "../../utils/device-detection";
import type { PresetCollection } from "../../types/audio.types";

interface HeaderProps {
  presets: PresetCollection;
  onPowerToggle: () => void;
  onHelpClick?: () => void;
}

export function Header({
  presets,
  onPowerToggle,
  onHelpClick,
}: HeaderProps): JSX.Element {
  const isMobile = useMemo(() => isMobileDevice(), []);

  const isRunning = useAudioStore((state) => state.isRunning);
  const currentPreset = useAudioStore((state) => state.currentPreset);
  const loadPreset = useAudioStore((state) => state.loadPreset);
  const bypassAll = useAudioStore((state) => state.bypassAll);
  const setParameter = useAudioStore((state) => state.setParameter);

  const handlePresetSelect = (
    _presetId: string,
    preset: (typeof presets)[string],
  ): void => {
    loadPreset(preset);
  };

  const handleBypassToggle = (): void => {
    setParameter("bypassAll", !bypassAll);
  };

  return (
    <header className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 pb-4 border-b border-white/6 gap-4">
      {/* Logo/Title */}
      <div className="flex items-center gap-3">
        <img
          src="/ember_app_icon.png"
          alt="Ember Amp"
          className="w-16 h-16 md:w-28 md:h-28 rounded-xl"
          loading="eager"
          fetchPriority="high"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-ember-orange to-accent-bright bg-clip-text text-transparent">
                EMBER
              </span>
              <span className="text-text-primary ml-2 md:ml-3">AMP</span>
            </h1>
            <span className="ml-1 md:ml-2 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-semibold bg-accent-primary/15 text-accent-primary border border-accent-primary/30 rounded-full uppercase tracking-wider">
              Beta
            </span>
          </div>
          <p className="text-xs md:text-sm text-text-secondary">
            HiFi Amplifier DSP
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full sm:w-auto">
        {/* Top row on mobile: Help + Preset */}
        <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
          {/* Help Button */}
          {onHelpClick && (
            <motion.button
              onClick={onHelpClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                w-10 h-10 md:w-12 md:h-12 rounded-full transition-colors duration-200
                bg-bg-secondary hover:bg-bg-hover
                text-text-secondary hover:text-accent-primary
                flex items-center justify-center flex-shrink-0
                text-lg md:text-xl font-light
              "
              style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
              title="Setup Guide"
              aria-label="Open setup guide"
            >
              ?
            </motion.button>
          )}

          {/* Preset Selector */}
          <PresetSelector
            presets={presets}
            currentPreset={currentPreset}
            onSelect={handlePresetSelect}
          />
        </div>

        {/* Bottom row on mobile: Bypass + Power */}
        <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
          {/* Master Bypass Button */}
          <motion.button
            onClick={handleBypassToggle}
            disabled={!isRunning}
            whileHover={!isRunning ? {} : { scale: 1.02 }}
            whileTap={!isRunning ? {} : { scale: 0.98 }}
            className={`
              px-3 py-2 md:px-4 md:py-3 rounded-lg font-semibold transition-colors duration-200
              flex items-center justify-center gap-2 text-sm md:text-base flex-1 sm:flex-initial
              ${
                !isRunning
                  ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                  : bypassAll
                    ? "bg-meter-yellow/20 text-meter-yellow"
                    : "bg-bg-secondary hover:bg-bg-hover text-text-secondary"
              }
            `}
            style={{
              border: !isRunning
                ? "1px solid rgba(255, 255, 255, 0.06)"
                : bypassAll
                  ? "1px solid rgba(250, 204, 21, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow:
                bypassAll && isRunning
                  ? "0 0 16px rgba(250, 204, 21, 0.2)"
                  : "none",
            }}
            title="Bypass all processing to hear dry signal"
            aria-label={
              bypassAll ? "Disable bypass mode" : "Enable bypass mode"
            }
            aria-pressed={bypassAll}
          >
            {/* Bypass LED indicator */}
            <motion.div
              className="w-2 h-2 rounded-full flex-shrink-0"
              animate={{
                backgroundColor: bypassAll && isRunning ? "#FACC15" : "#3F3F46",
                boxShadow:
                  bypassAll && isRunning
                    ? "0 0 8px rgba(250, 204, 21, 0.8)"
                    : "0 0 0 rgba(0, 0, 0, 0)",
              }}
              transition={{ duration: 0.2 }}
            />
            Bypass
          </motion.button>

          {/* Power Button */}
          <motion.button
            onClick={onPowerToggle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors duration-200
              flex items-center justify-center gap-2 text-sm md:text-base flex-1 sm:flex-initial
              ${
                isRunning
                  ? "bg-meter-red/20 text-meter-red"
                  : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30"
              }
            `}
            style={{
              border: isRunning
                ? "1px solid rgba(248, 113, 113, 0.4)"
                : "1px solid rgba(245, 158, 11, 0.4)",
              boxShadow: isRunning
                ? "0 0 16px rgba(248, 113, 113, 0.2)"
                : "0 0 16px rgba(245, 158, 11, 0.15)",
            }}
            title={isMobile ? "Power on to use Preview" : undefined}
            aria-label={
              isRunning ? "Power off the amplifier" : "Power on the amplifier"
            }
            aria-pressed={isRunning}
          >
            {/* Power LED indicator */}
            <motion.div
              className="w-2 h-2 rounded-full flex-shrink-0"
              animate={{
                backgroundColor: isRunning ? "#4ADE80" : "#3F3F46",
                boxShadow: isRunning
                  ? "0 0 8px rgba(74, 222, 128, 0.8)"
                  : "0 0 0 rgba(0, 0, 0, 0)",
              }}
              transition={{ duration: 0.2 }}
            />
            {isRunning ? "Power Off" : "Power On"}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
