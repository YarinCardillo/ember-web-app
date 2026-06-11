/**
 * OutputStage - Output bar (mockup layout): output fader + segmented meter,
 * output device selector, status LEDs, and LUFS readout.
 */

import { useState, useEffect, useRef } from "react";
import { TEFader } from "../ui/te/TEFader";
import { TESegmentMeter } from "../ui/te/TESegmentMeter";
import { useAudioStore } from "../../store/useAudioStore";
import {
  createLufsState,
  calculateShortTermLufs,
  formatLufs,
} from "../../utils/lufs-meter";
import { cn } from "@/lib/utils";
import type { AudioDeviceInfo } from "../../types/audio.types";
import type { LufsState } from "../../utils/lufs-meter";

const SELECT_CLASS =
  "w-full cursor-pointer rounded-md border border-border bg-popover px-3 py-2 font-mono text-[11px] tracking-tight text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

interface StatusDotProps {
  label: string;
  active: boolean;
  tone: "brand" | "destructive";
}

function StatusDot({ label, active, tone }: StatusDotProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "size-2 rounded-full transition-colors",
          !active && "bg-border",
          active && tone === "brand" && "bg-brand",
          active && tone === "destructive" && "bg-destructive",
        )}
        style={
          active && tone === "destructive"
            ? { boxShadow: `0 0 0 3px hsl(var(--${tone}) / 0.14)` }
            : undefined
        }
      />
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function OutputStage({
  preClipperAnalyserLeft,
  preClipperAnalyserRight,
  postGainAnalyserLeft,
  outputDevices,
  onOutputDeviceChange,
  isOutputDeviceSupported,
  isMobileMode = false,
}: OutputStageProps): JSX.Element {
  const preGain = useAudioStore((state) => state.preGain);
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const setParameter = useAudioStore((state) => state.setParameter);

  const [outputLufs, setOutputLufs] = useState(-Infinity);
  const [hasSignal, setHasSignal] = useState(false);
  const [isClipping, setIsClipping] = useState(false);
  const animationRef = useRef<number>();
  const lufsStateRef = useRef<LufsState | null>(null);

  // LUFS short-term from post-gain analyser (left channel, mono-compatible).
  useEffect(() => {
    if (!postGainAnalyserLeft) return;

    if (!lufsStateRef.current) {
      lufsStateRef.current = createLufsState(
        postGainAnalyserLeft.context.sampleRate,
      );
    }

    const updateLevel = () => {
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [postGainAnalyserLeft]);

  // Clip detection from pre-clipper signal (peak > 0dB), either channel.
  const clipAnimationRef = useRef<number>();
  useEffect(() => {
    if (!preClipperAnalyserLeft) return;

    const dataArrayL = new Float32Array(preClipperAnalyserLeft.fftSize);
    const dataArrayR = preClipperAnalyserRight
      ? new Float32Array(preClipperAnalyserRight.fftSize)
      : null;

    const checkClipping = () => {
      preClipperAnalyserLeft.getFloatTimeDomainData(dataArrayL);
      if (preClipperAnalyserRight && dataArrayR) {
        preClipperAnalyserRight.getFloatTimeDomainData(dataArrayR);
      }

      let peakL = 0;
      for (let i = 0; i < dataArrayL.length; i++) {
        const abs = Math.abs(dataArrayL[i]);
        if (abs > peakL) peakL = abs;
      }

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
      if (clipAnimationRef.current) cancelAnimationFrame(clipAnimationRef.current);
    };
  }, [preClipperAnalyserLeft, preClipperAnalyserRight]);

  const formatGainValue = (value: number): string =>
    value <= -90 ? "-Inf dB" : `${value.toFixed(1)} dB`;

  return (
    <div className="grid grid-cols-1 gap-6 px-6 py-5 md:grid-cols-[1.6fr_1fr_auto] md:items-start md:gap-8">
      {/* Output fader + segmented meter */}
      <div className="flex flex-col gap-2.5">
        <div className="flex h-[22px] items-center">
          <TEFader
            label="Output"
            value={preGain}
            min={-36}
            max={36}
            step={0.1}
            formatValue={formatGainValue}
            onChange={(value) => setParameter("preGain", value)}
            defaultValue={0}
          />
        </div>
        <TESegmentMeter
          analyserLeft={preClipperAnalyserLeft}
          analyserRight={preClipperAnalyserRight}
        />
      </div>

      {/* Output device */}
      <div className="flex flex-col gap-2.5">
        <div className="flex h-[22px] items-center">
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Out
          </span>
        </div>
        {isMobileMode ? (
          <div className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground">
            Default (mobile)
          </div>
        ) : isOutputDeviceSupported ? (
          <select
            value={outputDeviceId || "default"}
            onChange={(e) => {
              const deviceId = e.target.value;
              useAudioStore
                .getState()
                .setOutputDevice(deviceId === "default" ? null : deviceId);
              if (deviceId !== "default") onOutputDeviceChange(deviceId);
            }}
            className={SELECT_CLASS}
          >
            {outputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        ) : (
          <p className="font-mono text-[11px] text-muted-foreground">
            Not supported in this browser
          </p>
        )}
      </div>

      {/* Status + LUFS metric */}
      <div className="flex flex-col gap-3 md:items-end">
        <div className="flex h-[22px] items-center gap-4">
          <StatusDot label="Signal" active={hasSignal} tone="brand" />
          <StatusDot label="Clip" active={isClipping} tone="destructive" />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
            Short Term
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="min-w-[5ch] text-right font-mono text-xl leading-none tabular-nums text-foreground">
              {formatLufs(outputLufs)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              LUFS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
