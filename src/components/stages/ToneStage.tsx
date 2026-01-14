/**
 * ToneStage - Premium Bass/Mid/Treble/Presence knobs
 * Supports both modern and vintage themes (TONE STACK in vintage)
 */

import { Knob } from "../ui/Knob";
import { Toggle } from "../ui/Toggle";
import { Screws } from "../ui/Screw";
import { PilotLight } from "../ui/PilotLight";
import { useAudioStore } from "../../store/useAudioStore";
import { useThemeStore } from "../../store/useThemeStore";

export function ToneStage(): JSX.Element {
  const bass = useAudioStore((state) => state.bass);
  const mid = useAudioStore((state) => state.mid);
  const treble = useAudioStore((state) => state.treble);
  const presence = useAudioStore((state) => state.presence);
  const setParameter = useAudioStore((state) => state.setParameter);
  const bypassToneStack = useAudioStore((state) => state.bypassToneStack);

  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";
  const isActive = !bypassToneStack;

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden relative">
      <Screws />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isVintage && <PilotLight isActive={isActive} />}
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
                : { fontSize: "18px", color: "#e8dccc" }
            }
          >
            {isVintage ? "TONE STACK" : "EQUALIZER"}
          </h3>
        </div>
        <Toggle
          checked={isActive}
          onChange={(checked) => setParameter("bypassToneStack", !checked)}
        />
      </div>

      <div className="flex items-center justify-around gap-4 flex-1 my-auto pb-6 min-w-0 flex-wrap">
        <Knob
          label="Bass"
          value={bass}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter("bass", value)}
          defaultValue={0}
        />
        <Knob
          label="Mid"
          value={mid}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter("mid", value)}
          defaultValue={0}
        />
        <Knob
          label="Treble"
          value={treble}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter("treble", value)}
          defaultValue={0}
        />
        <Knob
          label="Presence"
          value={presence}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter("presence", value)}
          defaultValue={0}
        />
      </div>
    </div>
  );
}
