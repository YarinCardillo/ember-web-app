/**
 * OutputStage - Premium output device selector, master gain slider, and LED meter
 * Supports both modern and vintage themes with LCD display
 */

import { useState, useEffect, useRef } from "react";
import { MasterSlider } from "../ui/MasterSlider";
import { StereoMeter } from "../ui/StereoMeter";
import { VintageStereoMeter } from "../ui/VintageStereoMeter";
import { Screws } from "../ui/Screw";
import { JewelLed } from "../ui/JewelLed";
import { PilotLight } from "../ui/PilotLight";
import { useAudioStore } from "../../store/useAudioStore";
import { useThemeStore } from "../../store/useThemeStore";
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
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const setParameter = useAudioStore((state) => state.setParameter);
  const isRunning = useAudioStore((state) => state.isRunning);

  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";

  // State for LCD display level
  const [outputLevel, setOutputLevel] = useState(-Infinity);
  const [hasSignal, setHasSignal] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  const animationRef = useRef<number>();

  // Update output level from analyser
  useEffect(() => {
    if (!postGainAnalyser) {
      return;
    }

    const dataArray = new Float32Array(postGainAnalyser.fftSize);

    const updateLevel = () => {
      postGainAnalyser.getFloatTimeDomainData(dataArray);

      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const abs = Math.abs(dataArray[i]);
        if (abs > peak) {
          peak = abs;
        }
      }

      const dB = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
      setOutputLevel(dB);
      setHasSignal(dB > -60);
      setIsClipping(dB > -0.1);

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [postGainAnalyser]);

  const formatGainValue = (value: number): string => {
    if (value <= -90) {
      return "-Inf dB";
    }
    return `${value.toFixed(1)} dB`;
  };

  const formatLcdValue = (dB: number): string => {
    if (dB <= -60) {
      return "-Inf";
    }
    return dB.toFixed(1);
  };

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden relative">
      <Screws />

      {/* Title */}
      <div className="flex items-center gap-2">
        {isVintage && <PilotLight isActive={isRunning} />}
        <h3
          className="text-lg font-semibold"
          style={
            isVintage
              ? {
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  letterSpacing: "3px",
                  color: "#c9a66b",
                  fontWeight: 400,
                }
              : { color: "#e8dccc" }
          }
        >
          OUTPUT
        </h3>
      </div>

      {/* Output Device Selector */}
      <div className="flex flex-col gap-2 min-h-[60px]">
        <label
          className="text-xs text-text-secondary"
          style={isVintage ? { marginLeft: "16px" } : undefined}
        >
          Device
        </label>
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
              border: isVintage
                ? "1px solid #2a2520"
                : "1px solid rgba(255, 255, 255, 0.1)",
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

      <div className="flex flex-col items-center justify-start gap-2 mt-4 pb-4 px-4 min-w-0">
        {/* Pre-clipper gain control, post-clipper metering */}
        <div className="w-full">
          <MasterSlider
            label=""
            value={preGain}
            minDb={-36}
            maxDb={36}
            centerDb={0}
            step={0.1}
            formatValue={formatGainValue}
            onChange={(value) => setParameter("preGain", value)}
            defaultValue={0}
            showValue={false}
          />
        </div>
        {isVintage ? (
          <VintageStereoMeter analyser={preClipperAnalyser} width={420} />
        ) : (
          <StereoMeter
            analyser={preClipperAnalyser}
            label=""
            mode="peak"
            width={420}
          />
        )}

        {/* Status LEDs */}
        {isVintage ? (
          <div
            className="flex justify-between mt-6 mb-4"
            style={{ width: 400 }}
          >
            <JewelLed
              color={hasSignal ? "green" : "off"}
              label="Signal"
              size={14}
            />
            <JewelLed
              color={isRunning ? "amber" : "off"}
              label="Active"
              size={14}
            />
            <JewelLed
              color={isClipping ? "red" : "off"}
              label="Clip"
              size={14}
            />
          </div>
        ) : (
          <div
            className="flex justify-between mt-6 mb-4"
            style={{ width: 400 }}
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className="rounded-full transition-all duration-150"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: hasSignal ? "#4ADE80" : "#27272a",
                  boxShadow: hasSignal
                    ? "0 0 8px rgba(74, 222, 128, 0.6)"
                    : "none",
                }}
              />
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                Signal
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="rounded-full transition-all duration-150"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: isRunning ? "#F59E0B" : "#27272a",
                  boxShadow: isRunning
                    ? "0 0 8px rgba(245, 158, 11, 0.6)"
                    : "none",
                }}
              />
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                Active
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="rounded-full transition-all duration-150"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: isClipping ? "#F87171" : "#27272a",
                  boxShadow: isClipping
                    ? "0 0 8px rgba(248, 113, 113, 0.6)"
                    : "none",
                }}
              />
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider">
                Clip
              </span>
            </div>
          </div>
        )}

        {/* Vintage: LCD Display */}
        {isVintage && (
          <div
            className="lcd-display flex-1 flex flex-col justify-center"
            style={{ width: 420, minHeight: 180 }}
          >
            <div className="lcd-label text-center" style={{ fontSize: 14 }}>
              LUFs SHORT
            </div>
            <div
              className="lcd-value text-center mt-2"
              style={{ fontSize: 48, minWidth: 200 }}
            >
              {formatLcdValue(outputLevel)}
              <span className="lcd-unit" style={{ fontSize: 18 }}>
                LUFs
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
