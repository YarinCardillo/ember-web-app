/**
 * SaturationStage - Premium Drive, harmonics, and mix controls
 * Supports both modern and vintage themes
 */

import { Knob } from "../ui/Knob";
import { Toggle } from "../ui/Toggle";
import { Screws } from "../ui/Screw";
import { PilotLight } from "../ui/PilotLight";
import { useAudioStore } from "../../store/useAudioStore";
import { useThemeStore } from "../../store/useThemeStore";

export function SaturationStage(): JSX.Element {
  const drive = useAudioStore((state) => state.drive);
  const harmonics = useAudioStore((state) => state.harmonics);
  const saturationMix = useAudioStore((state) => state.saturationMix);
  const bypassSaturation = useAudioStore((state) => state.bypassSaturation);
  const setParameter = useAudioStore((state) => state.setParameter);

  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";
  const isActive = !bypassSaturation;

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden relative">
      <Screws />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isVintage && <PilotLight isActive={isActive} />}
          <h3
            className="text-lg font-semibold"
            style={
              isVintage
                ? {
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    letterSpacing: "3px",
                    color: "#c9a66b",
                    fontWeight: 400,
                  }
                : { color: "#e8dccc" }
            }
          >
            TUBES
          </h3>
        </div>
        <Toggle
          checked={isActive}
          onChange={(checked) => setParameter("bypassSaturation", !checked)}
        />
      </div>

      <div className="flex items-center justify-around gap-4 flex-1 my-auto pb-6 min-w-0 flex-wrap">
        <Knob
          label="Drive"
          value={drive}
          min={0}
          max={1}
          step={0.01}
          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(value) => setParameter("drive", value)}
          defaultValue={0.3}
        />
        <Knob
          label="Harmonics"
          value={harmonics}
          min={0}
          max={1}
          step={0.01}
          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(value) => setParameter("harmonics", value)}
          defaultValue={0.5}
        />
        <Knob
          label="Mix"
          value={saturationMix}
          min={0}
          max={1}
          step={0.01}
          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(value) => setParameter("saturationMix", value)}
          defaultValue={0.6}
        />
      </div>
    </div>
  );
}
