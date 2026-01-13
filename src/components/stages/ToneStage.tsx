/**
 * ToneStage - Premium Bass/Mid/Treble/Presence knobs
 */

import { Knob } from "../ui/Knob";
import { Toggle } from "../ui/Toggle";
import { useAudioStore } from "../../store/useAudioStore";

export function ToneStage(): JSX.Element {
  const bass = useAudioStore((state) => state.bass);
  const mid = useAudioStore((state) => state.mid);
  const treble = useAudioStore((state) => state.treble);
  const presence = useAudioStore((state) => state.presence);
  const setParameter = useAudioStore((state) => state.setParameter);
  const bypassToneStack = useAudioStore((state) => state.bypassToneStack);

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: "#e8dccc" }}>
          EQUALIZER
        </h3>
        <Toggle
          checked={!bypassToneStack}
          onChange={(checked) => setParameter("bypassToneStack", !checked)}
        />
      </div>

      <div className="grid grid-cols-2 sm:flex sm:justify-around gap-4 flex-1 my-auto pb-6 min-w-0 place-items-center">
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
