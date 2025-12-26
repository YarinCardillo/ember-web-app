/**
 * DriveStage - Drive knob and saturation bypass toggle
 */

import { Knob } from '../ui/Knob';
import { Toggle } from '../ui/Toggle';
import { useAudioStore } from '../../store/useAudioStore';

export function DriveStage(): JSX.Element {
  const drive = useAudioStore((state) => state.drive);
  const bypassSaturation = useAudioStore((state) => state.bypassSaturation);
  const setParameter = useAudioStore((state) => state.setParameter);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <h3 className="text-lg font-semibold text-ember-orange">Drive</h3>
      
      <div className="flex items-center justify-center gap-8">
        <Knob
          label="Drive"
          value={drive}
          min={0}
          max={1}
          step={0.01}
          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(value) => setParameter('drive', value)}
          defaultValue={0.3}
        />
        <Toggle
          label="Bypass"
          checked={!bypassSaturation}
          onChange={(checked) => setParameter('bypassSaturation', !checked)}
        />
      </div>
    </div>
  );
}

