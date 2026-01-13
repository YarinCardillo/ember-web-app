/**
 * OutputStage - Premium output device selector, master gain slider, and LED meter
 */

import { MasterSlider } from "../ui/MasterSlider";
import { StereoMeter } from "../ui/StereoMeter";
import { OutputMeter } from "../ui/OutputMeter";
import { useAudioStore } from "../../store/useAudioStore";
import type { AudioDeviceInfo } from "../../types/audio.types";

interface OutputStageProps {
  preClipperAnalyser: AnalyserNode | null;
  postGainAnalyser: AnalyserNode | null;
  outputDevices: AudioDeviceInfo[];
  onOutputDeviceChange: (deviceId: string) => void;
  isOutputDeviceSupported: boolean;
  isMobileMode?: boolean;
}

export function OutputStage({
  preClipperAnalyser,
  postGainAnalyser,
  outputDevices,
  onOutputDeviceChange,
  isOutputDeviceSupported,
  isMobileMode = false,
}: OutputStageProps): JSX.Element {
  const preGain = useAudioStore((state) => state.preGain);
  const outputGain = useAudioStore((state) => state.outputGain);
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const setParameter = useAudioStore((state) => state.setParameter);

  const formatGainValue = (value: number): string => {
    if (value <= -90) {
      return "-Inf dB";
    }
    return `${value.toFixed(1)} dB`;
  };

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold" style={{ color: "#e8dccc" }}>
        OUTPUT
      </h3>

      {/* Output Device Selector */}
      <div className="flex flex-col gap-2 min-h-[60px]">
        <label className="text-xs text-text-secondary">Device</label>
        {isMobileMode ? (
          <div className="bg-bg-tertiary/50 border border-white/5 rounded-lg px-3 py-2 text-text-tertiary text-sm">
            Default output (mobile)
          </div>
        ) : isOutputDeviceSupported ? (
          <select
            value={outputDeviceId || "default"}
            onChange={(e) => {
              const deviceId = e.target.value;
              useAudioStore
                .getState()
                .setOutputDevice(deviceId === "default" ? null : deviceId);
              if (deviceId !== "default") {
                onOutputDeviceChange(deviceId);
              }
            }}
            className="
              bg-bg-secondary text-text-primary rounded-lg
              px-3 py-2 text-sm
              focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
              cursor-pointer w-full
              transition-colors duration-150 hover:bg-bg-hover
            "
            style={{
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {outputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-text-tertiary py-2">
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
            onChange={(value) => setParameter("preGain", value)}
            defaultValue={0}
          />
        </div>
        <StereoMeter
          analyser={preClipperAnalyser}
          label="Clipper"
          mode="peak"
        />

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
            onChange={(value) => setParameter("outputGain", value)}
            defaultValue={0}
          />
        </div>
        <OutputMeter
          analyser={postGainAnalyser}
          label="DAC out (Don't clip this!)"
          mode="peak"
        />
      </div>
    </div>
  );
}
