/**
 * InputStage - Premium device selector, input gain knob, and input VU meter
 * Supports both modern and vintage themes
 */

import { VerticalSlider } from "../ui/VerticalSlider";
import { VintageVuMeter } from "../ui/VintageVuMeter";
import { TapeButton } from "../ui/TapeButton";
import { VinylButton } from "../ui/VinylButton";
import { VinylIntensitySlider } from "../ui/VinylIntensitySlider";
import { PreviewButton } from "../ui/PreviewButton";
import { Screws } from "../ui/Screw";
import { PilotLight } from "../ui/PilotLight";
import { useAudioStore } from "../../store/useAudioStore";
import { useThemeStore } from "../../store/useThemeStore";
import type { AudioDeviceInfo } from "../../types/audio.types";

interface InputStageProps {
  devices: AudioDeviceInfo[];
  inputAnalyser: AnalyserNode | null;
  onDeviceChange: (deviceId: string) => void;
  onVinylModeActivate?: () => void;
  onVinylModeDeactivate?: () => void;
  onVinylIntensityChange?: (intensity: number) => void;
  isPreviewPlaying?: boolean;
  isPreviewLoading?: boolean;
  onPreviewToggle?: () => void;
  isMobileMode?: boolean;
  isDangerous?: boolean;
}

export function InputStage({
  devices,
  inputAnalyser,
  onDeviceChange,
  onVinylModeActivate,
  onVinylModeDeactivate,
  onVinylIntensityChange,
  isPreviewPlaying = false,
  isPreviewLoading = false,
  onPreviewToggle,
  isMobileMode = false,
  isDangerous = false,
}: InputStageProps): JSX.Element {
  const inputGain = useAudioStore((state) => state.inputGain);
  const setParameter = useAudioStore((state) => state.setParameter);
  const inputDeviceId = useAudioStore((state) => state.inputDeviceId);
  const bypassTapeSim = useAudioStore((state) => state.bypassTapeSim);
  const vinylModeActive = useAudioStore((state) => state.vinylMode.isActive);
  const vinylIntensity = useAudioStore((state) => state.vinylMode.intensity);
  const isRunning = useAudioStore((state) => state.isRunning);

  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden relative">
      <Screws />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isVintage && <PilotLight isActive={isRunning} />}
          <h3
            className="font-semibold"
            style={
              isVintage
                ? {
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: "20px",
                    letterSpacing: "4px",
                    color: "#c9a66b",
                    fontWeight: 400,
                  }
                : { fontSize: "18px", lineHeight: "1.2", color: "#e8dccc" }
            }
          >
            INPUT
          </h3>
        </div>
        <div
          className="flex items-center gap-2 justify-end"
          style={{ minWidth: "140px" }}
        >
          <VinylIntensitySlider
            value={vinylIntensity}
            onChange={onVinylIntensityChange ?? (() => {})}
            visible={vinylModeActive}
          />
          <div className="translate-x-1.5">
            <VinylButton
              active={vinylModeActive}
              onActivate={onVinylModeActivate}
              onDeactivate={onVinylModeDeactivate}
              disabled={!isRunning}
            />
          </div>
          <div className="translate-x-1.5">
            <TapeButton
              checked={!bypassTapeSim}
              onChange={(checked) => setParameter("bypassTapeSim", !checked)}
              disabled={!isRunning}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 min-h-[60px]">
        <label
          className="text-xs text-text-secondary"
          style={isVintage ? { marginLeft: "16px" } : undefined}
        >
          {isMobileMode ? "Preview Only" : "Device"}
        </label>
        {isMobileMode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-bg-tertiary/50 border border-white/5 rounded-lg px-3 py-2 text-text-tertiary text-sm">
              Mic input disabled on mobile
            </div>
            {onPreviewToggle && (
              <PreviewButton
                isPlaying={isPreviewPlaying}
                isLoading={isPreviewLoading}
                disabled={!isRunning}
                onToggle={onPreviewToggle}
              />
            )}
          </div>
        ) : (
          <div className="relative flex items-center gap-2">
            <select
              value={inputDeviceId || ""}
              onChange={(e) => {
                const deviceId = e.target.value;
                if (deviceId) {
                  onDeviceChange(deviceId);
                }
              }}
              className={`
                bg-bg-secondary text-text-primary rounded-lg
                px-3 py-2 text-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
                cursor-pointer w-full
                transition-colors duration-150 hover:bg-bg-hover
              `}
              style={{
                border: isDangerous
                  ? "1px solid rgba(248, 113, 113, 0.5)"
                  : isVintage
                    ? "1px solid #2a2520"
                    : "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <option value="" disabled>
                Select Input Device...
              </option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Device ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            {isDangerous && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 bg-meter-red/20 px-2 py-0.5 rounded text-xs text-meter-red border border-meter-red/30 backdrop-blur-sm">
                <span>Warning</span>
              </div>
            )}
            {onPreviewToggle && (
              <PreviewButton
                isPlaying={isPreviewPlaying}
                isLoading={isPreviewLoading}
                disabled={!isRunning}
                onToggle={onPreviewToggle}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 sm:gap-10 min-w-0 py-2 flex-col-reverse sm:flex-row">
        <div style={{ marginTop: "8px" }} className="flex-shrink-0">
          <VerticalSlider
            label=""
            value={inputGain}
            minDb={-36}
            maxDb={36}
            centerDb={0}
            step={0.5}
            height={170}
            onChange={(value) => setParameter("inputGain", value)}
            defaultValue={0}
          />
        </div>
        <div className="w-full sm:flex-1 flex justify-center sm:justify-end px-2 sm:px-0 sm:mr-5">
          <VintageVuMeter analyser={inputAnalyser} label="" width={350} />
        </div>
      </div>
    </div>
  );
}
