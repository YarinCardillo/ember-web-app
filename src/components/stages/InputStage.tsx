/**
 * InputStage - Device selector, input gain knob, and input VU meter
 */

import { Knob } from '../ui/Knob';
import { VUMeter } from '../ui/VUMeter';
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

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <h3 className="text-lg font-semibold text-ember-orange">INPUT</h3>
      
      <div className="flex flex-col gap-2">
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
            px-3 py-2 text-text-light
            focus:outline-none focus:ring-2 focus:ring-ember-orange
            cursor-pointer
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

      <div className="flex items-center gap-8">
        <Knob
          label="Gain"
          value={inputGain}
          min={-36}
          max={36}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter('inputGain', value)}
          defaultValue={-12}
        />
        <VUMeter analyser={inputAnalyser} label="Input" />
      </div>
    </div>
  );
}

