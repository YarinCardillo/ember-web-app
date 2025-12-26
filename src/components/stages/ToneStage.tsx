/**
 * ToneStage - Bass/Mid/Treble/Presence knobs
 */

import { Knob } from '../ui/Knob';
import { useAudioStore } from '../../store/useAudioStore';

export function ToneStage(): JSX.Element {
  const bass = useAudioStore((state) => state.bass);
  const mid = useAudioStore((state) => state.mid);
  const treble = useAudioStore((state) => state.treble);
  const presence = useAudioStore((state) => state.presence);
  const setParameter = useAudioStore((state) => state.setParameter);
  const bypassToneStack = useAudioStore((state) => state.bypassToneStack);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ember-orange">Tone Stack</h3>
        <label className="flex items-center gap-2 text-sm text-text-light">
          <input
            type="checkbox"
            checked={!bypassToneStack}
            onChange={(e) => setParameter('bypassToneStack', !e.target.checked)}
            className="w-4 h-4"
          />
          <span>Active</span>
        </label>
      </div>

      <div className="flex items-center justify-around gap-4">
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

