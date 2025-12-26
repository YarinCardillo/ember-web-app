/**
 * OutputStage - Output device selector, gain knob, and VU meter
 */

import { Knob } from '../ui/Knob';
import { VUMeter } from '../ui/VUMeter';
import { useAudioStore } from '../../store/useAudioStore';
import type { AudioDeviceInfo } from '../../types/audio.types';

interface OutputStageProps {
  outputAnalyser: AnalyserNode | null;
  outputDevices: AudioDeviceInfo[];
  onOutputDeviceChange: (deviceId: string) => void;
  isOutputDeviceSupported: boolean;
}

export function OutputStage({
  outputAnalyser,
  outputDevices,
  onOutputDeviceChange,
  isOutputDeviceSupported,
}: OutputStageProps): JSX.Element {
  const outputGain = useAudioStore((state) => state.outputGain);
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const setParameter = useAudioStore((state) => state.setParameter);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <h3 className="text-lg font-semibold text-ember-orange">OUTPUT</h3>
      
      {/* Output Device Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-text-light opacity-80">Device</label>
        {isOutputDeviceSupported ? (
          <select
            value={outputDeviceId || ''}
            onChange={(e) => {
              const deviceId = e.target.value;
              useAudioStore.getState().setOutputDevice(deviceId || null);
              if (deviceId) {
                onOutputDeviceChange(deviceId);
              }
            }}
            className="
              bg-gray-800 border border-gray-700 rounded
              px-3 py-2 text-text-light text-sm
              focus:outline-none focus:ring-2 focus:ring-ember-orange
              cursor-pointer
            "
          >
            <option value="">Default Output</option>
            {outputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-text-light opacity-60">
            Output device selection not supported in this browser
          </p>
        )}
      </div>

      <div className="flex items-center gap-8">
        <Knob
          label="Gain"
          value={outputGain}
          min={-12}
          max={12}
          step={0.5}
          unit=" dB"
          onChange={(value) => setParameter('outputGain', value)}
          defaultValue={0}
        />
        <VUMeter analyser={outputAnalyser} label="Output" />
      </div>
    </div>
  );
}

