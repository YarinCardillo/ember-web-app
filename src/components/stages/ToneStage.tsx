/**
 * ToneStage - Bass/Mid/Treble/Presence knobs
 */

import { Knob } from '../ui/Knob';
import { Toggle } from '../ui/Toggle';
import { useAudioStore } from '../../store/useAudioStore';

export function ToneStage(): JSX.Element {
  const bass = useAudioStore((state) => state.bass);
  const mid = useAudioStore((state) => state.mid);
  const treble = useAudioStore((state) => state.treble);
  const presence = useAudioStore((state) => state.presence);
  const setParameter = useAudioStore((state) => state.setParameter);
  const bypassToneStack = useAudioStore((state) => state.bypassToneStack);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ember-orange">EQUALIZER</h3>
        <Toggle
          label="Active"
          checked={!bypassToneStack}
          onChange={(checked) => setParameter('bypassToneStack', !checked)}
        />
      </div>

      <div className="flex items-center justify-around gap-4 flex-1 my-auto pb-6">
        <Knob
          label="Bass"
          value={bass}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter('bass', value)}
          defaultValue={0}
        />
        <Knob
          label="Mid"
          value={mid}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter('mid', value)}
          defaultValue={0}
        />
        <Knob
          label="Treble"
          value={treble}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter('treble', value)}
          defaultValue={0}
        />
        <Knob
          label="Presence"
          value={presence}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter('presence', value)}
          defaultValue={0}
        />
      </div>
    </div>
  );
}

