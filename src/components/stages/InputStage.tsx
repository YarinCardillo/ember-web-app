/**
 * InputStage - Input bay: VU instrument, gain fader, device selector, and
 * tape / vinyl toggles (mockup layout, TE controls).
 */

import { TEBay } from "../ui/te/TEBay";
import { TEVuMeter } from "../ui/te/TEVuMeter";
import { TEFader } from "../ui/te/TEFader";
import { TEToggleButton } from "../ui/te/TEToggleButton";
import { VinylIntensitySlider } from "../ui/VinylIntensitySlider";
import { PreviewButton } from "../ui/PreviewButton";
import { CassetteTape, Disc3 } from "lucide-react";
import { useAudioStore } from "../../store/useAudioStore";
import { cn } from "@/lib/utils";
import type { AudioDeviceInfo } from "../../types/audio.types";

const SELECT_CLASS =
  "w-full cursor-pointer rounded-md border border-border bg-popover px-3 py-2 font-mono text-[11px] tracking-tight text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const formatDb = (value: number): string => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : " ";
  return `${sign}${Math.abs(value).toFixed(1)} dB`;
};

interface InputStageProps {
  devices: AudioDeviceInfo[];
  inputAnalyserLeft: AnalyserNode | null;
  inputAnalyserRight: AnalyserNode | null;
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
  inputAnalyserLeft,
  inputAnalyserRight,
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

  const handleVinylToggle = (): void => {
    if (vinylModeActive) onVinylModeDeactivate?.();
    else onVinylModeActivate?.();
  };

  return (
    <TEBay label="Input" aux="line" contentClassName="gap-5">
      <div className="flex justify-center">
        <TEVuMeter
          analyserLeft={inputAnalyserLeft}
          analyserRight={inputAnalyserRight}
        />
      </div>

      <TEFader
        label="Gain"
        value={inputGain}
        min={-36}
        max={36}
        step={0.5}
        formatValue={formatDb}
        onChange={(value) => setParameter("inputGain", value)}
        defaultValue={0}
      />

      {/* Device selector */}
      {isMobileMode ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground">
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
              if (e.target.value) onDeviceChange(e.target.value);
            }}
            className={cn(SELECT_CLASS, isDangerous && "border-destructive/60")}
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
            <div className="pointer-events-none absolute right-8 top-1/2 flex -translate-y-1/2 items-center rounded border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
              Warning
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

      {/* Tape / Vinyl */}
      <div className="flex items-center gap-2">
        <TEToggleButton
          label="Tape"
          icon={CassetteTape}
          active={!bypassTapeSim}
          onClick={() => setParameter("bypassTapeSim", !bypassTapeSim)}
          disabled={!isRunning}
          title="Tape saturation"
        />
        <TEToggleButton
          label="Vinyl"
          icon={Disc3}
          active={vinylModeActive}
          onClick={handleVinylToggle}
          disabled={!isRunning}
          title="Vinyl mode"
        />
        <VinylIntensitySlider
          value={vinylIntensity}
          onChange={onVinylIntensityChange ?? (() => {})}
          visible={vinylModeActive}
        />
      </div>
    </TEBay>
  );
}
