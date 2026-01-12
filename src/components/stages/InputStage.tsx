/**
 * InputStage - Premium device selector, input gain knob, and input VU meter
 */

import { Knob } from "../ui/Knob";
import { VUMeter } from "../ui/VUMeter";
import { TapeButton } from "../ui/TapeButton";
import { VinylButton } from "../ui/VinylButton";
import { PreviewButton } from "../ui/PreviewButton";
import { useAudioStore } from "../../store/useAudioStore";
import type { AudioDeviceInfo } from "../../types/audio.types";

interface InputStageProps {
  devices: AudioDeviceInfo[];
  inputAnalyser: AnalyserNode | null;
  onDeviceChange: (deviceId: string) => void;
  onVinylModeActivate?: () => void;
  onVinylModeDeactivate?: () => void;
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
  const isRunning = useAudioStore((state) => state.isRunning);

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold leading-none -mt-2"
          style={{ lineHeight: "1.2", color: "#e8dccc" }}
        >
          INPUT
        </h3>
        <div
          className="flex items-center gap-2 justify-end"
          style={{ marginTop: "-12px", minWidth: "140px" }}
        >
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
        <div className="flex items-center justify-between">
          <label className="text-xs text-text-secondary">
            {isMobileMode ? "Preview Only" : "Device"}
          </label>
          <div style={{ minWidth: "140px" }} className="flex justify-end">
            {onPreviewToggle && (
              <PreviewButton
                isPlaying={isPreviewPlaying}
                isLoading={isPreviewLoading}
                disabled={!isRunning}
                onToggle={onPreviewToggle}
              />
            )}
          </div>
        </div>
        {isMobileMode ? (
          <div className="bg-bg-tertiary/50 border border-white/5 rounded-lg px-3 py-2 text-text-tertiary text-sm">
            Mic input disabled on mobile
          </div>
        ) : (
          <div className="relative">
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
          </div>
        )}
      </div>

      <div className="flex items-start min-w-0">
        <div
          className="flex-1 flex justify-center min-w-0"
          style={{ marginTop: "40px", marginRight: "20px" }}
        >
          <Knob
            label="Gain"
            value={inputGain}
            min={-36}
            max={36}
            step={0.5}
            unit=" dB"
            onChange={(value) => setParameter("inputGain", value)}
            defaultValue={0}
          />
        </div>
        <div className="flex-shrink-0">
          <VUMeter analyser={inputAnalyser} label="Input" />
        </div>
      </div>
    </div>
  );
}
