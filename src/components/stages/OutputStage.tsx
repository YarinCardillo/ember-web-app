/**
 * OutputStage - Premium output device selector, master gain slider, and LED meter
 * Supports both modern and vintage themes with LCD display and LUFS metering
 */

import { useState, useEffect, useRef } from "react";
import { MasterSlider } from "../ui/MasterSlider";
import { StereoMeter } from "../ui/StereoMeter";
import { StereoMeterMinimal } from "../ui/StereoMeterMinimal";
import { Screws } from "../ui/Screw";
import { JewelLed } from "../ui/JewelLed";
import { PilotLight } from "../ui/PilotLight";
import { useAudioStore } from "../../store/useAudioStore";
import { useThemeStore } from "../../store/useThemeStore";
import {
  createLufsState,
  calculateShortTermLufs,
  formatLufs,
} from "../../utils/lufs-meter";
import type { AudioDeviceInfo } from "../../types/audio.types";
import type { LufsState } from "../../utils/lufs-meter";

interface OutputStageProps {
  preClipperAnalyserLeft: AnalyserNode | null;
  preClipperAnalyserRight: AnalyserNode | null;
  postGainAnalyserLeft: AnalyserNode | null;
  postGainAnalyserRight: AnalyserNode | null;
  outputDevices: AudioDeviceInfo[];
  onOutputDeviceChange: (deviceId: string) => void;
  isOutputDeviceSupported: boolean;
  isMobileMode?: boolean;
}

export function OutputStage({
  preClipperAnalyserLeft,
  preClipperAnalyserRight,
  postGainAnalyserLeft,
  postGainAnalyserRight: _postGainAnalyserRight,
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

  // State for LCD display LUFS level
  const [outputLufs, setOutputLufs] = useState(-Infinity);
  const [hasSignal, setHasSignal] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  const animationRef = useRef<number>();
  const lufsStateRef = useRef<LufsState | null>(null);

  // Update output LUFS level from analyser (for LCD display only)
  // Uses left channel for LUFS calculation (mono-compatible)
  useEffect(() => {
    if (!postGainAnalyserLeft) {
      return;
    }

    // Initialize LUFS state if needed
    if (!lufsStateRef.current) {
      lufsStateRef.current = createLufsState(
        postGainAnalyserLeft.context.sampleRate,
      );
    }

    const updateLevel = () => {
      // Calculate LUFS short-term (for display only)
      const lufs = calculateShortTermLufs(
        postGainAnalyserLeft,
        lufsStateRef.current!,
      );
      setOutputLufs(lufs);
      setHasSignal(lufs > -60);

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [postGainAnalyserLeft]);

  // Clip detection from pre-clipper signal (peak > 0dB)
  // Uses left channel for clip detection (either channel clipping triggers LED)
  const clipAnimationRef = useRef<number>();
  useEffect(() => {
    if (!preClipperAnalyserLeft) {
      return;
    }

    const dataArrayL = new Float32Array(preClipperAnalyserLeft.fftSize);
    const dataArrayR = preClipperAnalyserRight
      ? new Float32Array(preClipperAnalyserRight.fftSize)
      : null;

    const checkClipping = () => {
      preClipperAnalyserLeft.getFloatTimeDomainData(dataArrayL);
      if (preClipperAnalyserRight && dataArrayR) {
        preClipperAnalyserRight.getFloatTimeDomainData(dataArrayR);
      }

      // Check peak on left channel
      let peakL = 0;
      for (let i = 0; i < dataArrayL.length; i++) {
        const abs = Math.abs(dataArrayL[i]);
        if (abs > peakL) peakL = abs;
      }

      // Check peak on right channel
      let peakR = 0;
      if (dataArrayR) {
        for (let i = 0; i < dataArrayR.length; i++) {
          const abs = Math.abs(dataArrayR[i]);
          if (abs > peakR) peakR = abs;
        }
      }

      const peak = Math.max(peakL, peakR);
      const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
      setIsClipping(peakDb > 0);

      clipAnimationRef.current = requestAnimationFrame(checkClipping);
    };

    checkClipping();

    return () => {
      if (clipAnimationRef.current) {
        cancelAnimationFrame(clipAnimationRef.current);
      }
    };
  }, [preClipperAnalyserLeft, preClipperAnalyserRight]);

  const formatGainValue = (value: number): string => {
    if (value <= -90) {
      return "-Inf dB";
    }
    return `${value.toFixed(1)} dB`;
  };

  const formatLcdValue = (lufs: number): string => {
    return formatLufs(lufs);
  };

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full min-w-0 overflow-hidden relative">
      <Screws />

      {/* Title */}
      <div className="flex items-center gap-2">
        {isVintage && <PilotLight isActive={isRunning} />}
        <h3
          className="font-semibold"
          style={
            isVintage
              ? {
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: "20px",
                  letterSpacing: "4px",
                  color: "#c9a66b",
                  fontWeight: 400,
                }
              : { fontSize: "18px", color: "#e8dccc" }
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
            showValue={true}
          />
        </div>
        {isVintage ? (
          <StereoMeterMinimal
            analyserLeft={preClipperAnalyserLeft}
            analyserRight={preClipperAnalyserRight}
            label=""
            mode="peak"
          />
        ) : (
          <StereoMeter
            analyserLeft={preClipperAnalyserLeft}
            analyserRight={preClipperAnalyserRight}
            label=""
            mode="peak"
            width={420}
          />
        )}

        {/* Status LEDs */}
        {isVintage ? (
          <div className="flex justify-between mt-6 mb-4 w-full max-w-[400px]">
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
          <div className="flex justify-between mt-6 mb-4 w-full max-w-[400px]">
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
            className="lcd-display flex-1 flex flex-col justify-center w-full max-w-[420px]"
            style={{ minHeight: 180 }}
          >
            <div className="lcd-label text-center" style={{ fontSize: 14 }}>
              LUFS SHORT
            </div>
            <div
              className="lcd-value mt-2"
              style={{
                fontSize: 48,
                display: "flex",
                justifyContent: "center",
                alignItems: "baseline",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "140px",
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatLcdValue(outputLufs)}
              </span>
              <span
                className="lcd-unit"
                style={{ fontSize: 18, width: "50px", textAlign: "left" }}
              >
                LUFS
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
