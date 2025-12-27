/**
 * OutputStage - Output device selector, master gain slider, and LED meter
 */

import { MasterSlider } from '../ui/MasterSlider';
import { LEDMeter } from '../ui/LEDMeter';
import { useAudioStore } from '../../store/useAudioStore';
import type { AudioDeviceInfo } from '../../types/audio.types';

interface OutputStageProps {
  preClipperAnalyser: AnalyserNode | null;   // Pre-clipper (Clipper meter, shows clipping)
  postGainAnalyser: AnalyserNode | null;     // Post-gain (DAC out meter)
  outputDevices: AudioDeviceInfo[];
  onOutputDeviceChange: (deviceId: string) => void;
  isOutputDeviceSupported: boolean;
}

export function OutputStage({
  preClipperAnalyser,
  postGainAnalyser,
  outputDevices,
  onOutputDeviceChange,
  isOutputDeviceSupported,
}: OutputStageProps): JSX.Element {
  const preGain = useAudioStore((state) => state.preGain);
  const outputGain = useAudioStore((state) => state.outputGain);
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const setParameter = useAudioStore((state) => state.setParameter);

  // Format value to show -∞ for very low values
  const formatGainValue = (value: number): string => {
    if (value <= -90) {
      return '-∞ dB';
    }
    return `${value.toFixed(1)} dB`;
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 h-full min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold text-ember-orange">OUTPUT</h3>
      
      {/* Output Device Selector */}
      <div className="flex flex-col gap-2 min-h-[60px]">
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
              focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-orange
              cursor-pointer w-full
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
          <p className="text-xs text-text-light opacity-60 py-2">
            Output device selection not supported in this browser
          </p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-2 flex-1 my-auto pb-4 px-4 min-w-0">
        {/* Pre-clipper gain control, post-clipper metering */}
        <div className="w-full max-w-xs">
          <MasterSlider
            label="Gain"
            value={preGain}
            minDb={-36}
            maxDb={36}
            centerDb={0}
            step={0.1}
            formatValue={formatGainValue}
            onChange={(value) => setParameter('preGain', value)}
            defaultValue={0}
          />
        </div>
        <LEDMeter analyser={preClipperAnalyser} label="Clipper" mode="peak" />
        
        {/* Post-clipper section */}
        <div className="w-full max-w-xs mt-4">
          <MasterSlider
            label="Master"
            value={outputGain}
            minDb={-96}
            maxDb={12}
            centerDb={0}
            step={0.5}
            formatValue={formatGainValue}
            onChange={(value) => setParameter('outputGain', value)}
            defaultValue={0}
          />
        </div>
        <LEDMeter analyser={postGainAnalyser} label="DAC out (Don't clip this!)" mode="peak" />
      </div>
    </div>
  );
}

