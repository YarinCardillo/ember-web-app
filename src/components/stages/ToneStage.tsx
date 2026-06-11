/**
 * ToneStage - Bass/Mid/Treble/Presence EQ knobs (TE flat style).
 */

import { TEBay } from "../ui/te/TEBay";
import { TEKnob } from "../ui/te/TEKnob";
import { Switch } from "../ui/shadcn/switch";
import { useAudioStore } from "../../store/useAudioStore";

const formatDb = (value: number): string => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : " ";
  return `${sign}${Math.abs(value).toFixed(1)} dB`;
};

export function ToneStage(): JSX.Element {
  const bass = useAudioStore((state) => state.bass);
  const mid = useAudioStore((state) => state.mid);
  const treble = useAudioStore((state) => state.treble);
  const presence = useAudioStore((state) => state.presence);
  const setParameter = useAudioStore((state) => state.setParameter);
  const bypassToneStack = useAudioStore((state) => state.bypassToneStack);
  const isActive = !bypassToneStack;

  return (
    <TEBay
      label="Tone"
      aux="passive"
      action={
        <Switch
          checked={isActive}
          onCheckedChange={(checked) =>
            setParameter("bypassToneStack", !checked)
          }
          aria-label="Tone stack enabled"
        />
      }
      contentClassName="justify-center"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 place-items-center">
        <TEKnob
          label="Bass"
          value={bass}
          min={-12}
          max={12}
          step={0.5}
          formatValue={formatDb}
          onChange={(value) => setParameter("bass", value)}
          defaultValue={0}
        />
        <TEKnob
          label="Mid"
          value={mid}
          min={-12}
          max={12}
          step={0.5}
          formatValue={formatDb}
          onChange={(value) => setParameter("mid", value)}
          defaultValue={0}
        />
        <TEKnob
          label="Treble"
          value={treble}
          min={-12}
          max={12}
          step={0.5}
          formatValue={formatDb}
          onChange={(value) => setParameter("treble", value)}
          defaultValue={0}
        />
        <TEKnob
          label="Presence"
          value={presence}
          min={-12}
          max={12}
          step={0.5}
          formatValue={formatDb}
          onChange={(value) => setParameter("presence", value)}
          defaultValue={0}
        />
      </div>
    </TEBay>
  );
}
