/**
 * SaturationStage - Drive, harmonics, and mix controls
 */

import { Knob } from '../ui/Knob';
import { Toggle } from '../ui/Toggle';
import { useAudioStore } from '../../store/useAudioStore';

export function SaturationStage(): JSX.Element {
  const drive = useAudioStore((state) => state.drive);
  const harmonics = useAudioStore((state) => state.harmonics);
  const saturationMix = useAudioStore((state) => state.saturationMix);
  const bypassSaturation = useAudioStore((state) => state.bypassSaturation);
  const setParameter = useAudioStore((state) => state.setParameter);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ember-orange">TUBES</h3>
        <Toggle
          checked={!bypassSaturation}
          onChange={(checked) => setParameter('bypassSaturation', !checked)}
        />
      </div>
      
      <div className="flex items-center justify-around gap-4 flex-1 my-auto pb-6">
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
        <Knob
          label="Harmonics"
          value={harmonics}
          min={0}
          max={1}
          step={0.01}
          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(value) => setParameter('harmonics', value)}
          defaultValue={0.5}
        />
        <Knob
          label="Mix"
          value={saturationMix}
          min={0}
          max={1}
          step={0.01}
          formatValue={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(value) => setParameter('saturationMix', value)}
          defaultValue={0.6}
        />
      </div>
    </div>
  );
}

