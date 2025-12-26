/**
 * CompressorStage - Full compressor controls
 */

import { Knob } from '../ui/Knob';
import { Slider } from '../ui/Slider';
import { useAudioStore } from '../../store/useAudioStore';

export function CompressorStage(): JSX.Element {
  const compThreshold = useAudioStore((state) => state.compThreshold);
  const compRatio = useAudioStore((state) => state.compRatio);
  const compAttack = useAudioStore((state) => state.compAttack);
  const compRelease = useAudioStore((state) => state.compRelease);
  const bypassCompressor = useAudioStore((state) => state.bypassCompressor);
  const setParameter = useAudioStore((state) => state.setParameter);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ember-orange">Compressor</h3>
        <label className="flex items-center gap-2 text-sm text-text-light">
          <input
            type="checkbox"
            checked={!bypassCompressor}
            onChange={(e) => setParameter('bypassCompressor', !e.target.checked)}
            className="w-4 h-4"
          />
          <span>Active</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <Knob
            label="Threshold"
            value={compThreshold}
            min={-60}
            max={0}
            step={1}
            unit=" dB"
            onChange={(value) => setParameter('compThreshold', value)}
            defaultValue={-24}
          />
          <Slider
            label="Attack"
            value={compAttack}
            min={0.001}
            max={0.1}
            step={0.001}
            formatValue={(v) => `${(v * 1000).toFixed(0)} ms`}
            onChange={(value) => setParameter('compAttack', value)}
          />
        </div>
        <div className="flex flex-col gap-4">
          <Knob
            label="Ratio"
            value={compRatio}
            min={1}
            max={20}
            step={0.5}
            formatValue={(v) => `${v.toFixed(1)}:1`}
            onChange={(value) => setParameter('compRatio', value)}
            defaultValue={4}
          />
          <Slider
            label="Release"
            value={compRelease}
            min={0.01}
            max={1}
            step={0.01}
            formatValue={(v) => `${(v * 1000).toFixed(0)} ms`}
            onChange={(value) => setParameter('compRelease', value)}
          />
        </div>
      </div>
    </div>
  );
}

