/**
 * InputStage - Device selector, input gain knob, and input VU meter
 */

import { Knob } from '../ui/Knob';
import { VUMeter } from '../ui/VUMeter';
import { TapeButton } from '../ui/TapeButton';
import { useAudioStore } from '../../store/useAudioStore';
import type { AudioDeviceInfo } from '../../types/audio.types';

interface InputStageProps {
  devices: AudioDeviceInfo[];
  inputAnalyser: AnalyserNode | null;
  onDeviceChange: (deviceId: string) => void;
}

export function InputStage({
  devices,
  inputAnalyser,
  onDeviceChange,
}: InputStageProps): JSX.Element {
  const inputGain = useAudioStore((state) => state.inputGain);
  const setParameter = useAudioStore((state) => state.setParameter);
  const inputDeviceId = useAudioStore((state) => state.inputDeviceId);
  const bypassTapeSim = useAudioStore((state) => state.bypassTapeSim);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ember-orange leading-none -mt-2" style={{ lineHeight: '1.2' }}>INPUT</h3>
        <div className="flex flex-col items-center gap-2" style={{ marginTop: '-12px' }}>
          <TapeButton
            checked={!bypassTapeSim}
            onChange={(checked) => setParameter('bypassTapeSim', !checked)}
          />
        </div>
      </div>
      
      <div className="flex flex-col gap-2 min-h-[60px]">
        <label className="text-xs text-text-light opacity-80">Device</label>
        <select
          value={inputDeviceId || ''}
          onChange={(e) => {
            const deviceId = e.target.value;
            useAudioStore.getState().setInputDevice(deviceId || null);
            if (deviceId) {
              onDeviceChange(deviceId);
            }
          }}
          className="
            bg-gray-800 border border-gray-700 rounded
            px-3 py-2 text-text-light text-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-orange
            cursor-pointer w-full
          "
        >
          <option value="">Default Input</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Device ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start">
        <div className="flex-1 flex justify-center" style={{ marginTop: '40px', marginRight: '20px' }}>
          <Knob
            label="Gain"
            value={inputGain}
            min={-36}
            max={36}
            step={0.5}
            unit=" dB"
            onChange={(value) => setParameter('inputGain', value)}
            defaultValue={0}
          />
        </div>
        <VUMeter analyser={inputAnalyser} label="Input" />
      </div>
    </div>
  );
}

