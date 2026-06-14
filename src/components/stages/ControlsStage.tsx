/**
 * ControlsStage - Center bay: linked IN/OUT gain knobs plus the Tape and Vinyl
 * character toggles. The two knobs default linked (inverse delta), so pushing
 * the input backs the output off by the same amount and the perceived level
 * stays roughly put. The link lives in the UI; the audio path is untouched.
 */

import { useState } from "react";
import { CassetteTape, Disc3, Link2 } from "lucide-react";
import { TEKnob } from "../ui/te/TEKnob";
import { VinylIntensityKnob } from "../ui/VinylIntensityKnob";
import { TEBay } from "../ui/te/TEBay";
import { useAudioStore } from "../../store/useAudioStore";
import { cn } from "@/lib/utils";

const TOGGLE_CLASS =
  "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40";

const GAIN_MIN = -36;
const GAIN_MAX = 36;
const clampGain = (v: number): number =>
  Math.max(GAIN_MIN, Math.min(GAIN_MAX, v));
const formatDb = (value: number): string => `${value.toFixed(1)} dB`;

interface ControlsStageProps {
  onVinylModeActivate?: () => void;
  onVinylModeDeactivate?: () => void;
  onVinylIntensityChange?: (intensity: number) => void;
}

export function ControlsStage({
  onVinylModeActivate,
  onVinylModeDeactivate,
  onVinylIntensityChange,
}: ControlsStageProps): JSX.Element {
  const inputGain = useAudioStore((state) => state.inputGain);
  const preGain = useAudioStore((state) => state.preGain);
  const setParameter = useAudioStore((state) => state.setParameter);
  const bypassTapeSim = useAudioStore((state) => state.bypassTapeSim);
  const vinylModeActive = useAudioStore((state) => state.vinylMode.isActive);
  const vinylIntensity = useAudioStore((state) => state.vinylMode.intensity);
  const isRunning = useAudioStore((state) => state.isRunning);

  const [linkActive, setLinkActive] = useState(true);

  // Inverse-delta link: the grabbed knob moves freely, the other follows and
  // clamps at its rail without dragging the grabbed one back.
  const setIn = (value: number): void => {
    const next = clampGain(value);
    const delta = next - inputGain;
    setParameter("inputGain", next);
    if (linkActive) setParameter("preGain", clampGain(preGain - delta));
  };
  const setOut = (value: number): void => {
    const next = clampGain(value);
    const delta = next - preGain;
    setParameter("preGain", next);
    if (linkActive) setParameter("inputGain", clampGain(inputGain - delta));
  };

  const handleVinylToggle = (): void => {
    if (vinylModeActive) onVinylModeDeactivate?.();
    else onVinylModeActivate?.();
  };

  return (
    <TEBay label="Controls" contentClassName="gap-6">
      <div className="flex items-center justify-center gap-2">
        <TEKnob
          label="In"
          value={inputGain}
          min={GAIN_MIN}
          max={GAIN_MAX}
          unit=" dB"
          formatValue={formatDb}
          onChange={setIn}
          defaultValue={-12}
        />
        <button
          type="button"
          onClick={() => setLinkActive((v) => !v)}
          aria-label="Link input and output"
          aria-pressed={linkActive}
          title="Link in and out"
          className={cn(
            "flex h-7 w-5 items-center justify-center transition-opacity",
            linkActive
              ? "text-foreground opacity-100"
              : "text-muted-foreground opacity-40 hover:opacity-100",
          )}
        >
          <Link2 className="size-3.5" />
        </button>
        <TEKnob
          label="Out"
          value={preGain}
          min={GAIN_MIN}
          max={GAIN_MAX}
          unit=" dB"
          formatValue={formatDb}
          onChange={setOut}
          defaultValue={12}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => setParameter("bypassTapeSim", !bypassTapeSim)}
            disabled={!isRunning}
            aria-pressed={!bypassTapeSim}
            title="Tape saturation"
            className={cn(
              TOGGLE_CLASS,
              !bypassTapeSim
                ? "text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CassetteTape className="size-3.5" strokeWidth={2} />
            Tape
          </button>
          <button
            type="button"
            onClick={handleVinylToggle}
            disabled={!isRunning}
            aria-pressed={vinylModeActive}
            title="Vinyl mode"
            className={cn(
              TOGGLE_CLASS,
              vinylModeActive
                ? "text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Disc3 className="size-3.5" strokeWidth={2} />
            Vinyl
          </button>
        </div>

        {/* Intensity knob sits in a fixed slot below the pair and only fades in
            and out, so it never nudges the Tape/Vinyl buttons. */}
        <div
          className={cn(
            "flex h-[34px] items-center justify-center transition-opacity duration-200 ease-out",
            vinylModeActive ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <VinylIntensityKnob
            value={vinylIntensity}
            onChange={onVinylIntensityChange ?? (() => {})}
          />
        </div>
      </div>
    </TEBay>
  );
}
