/**
 * Footer - Device foot bar (mockup layout): signal route, engine state, version.
 */

import { useState, useEffect } from "react";
import { useAudioStore } from "../../store/useAudioStore";
import AudioEngine from "../../audio/AudioEngine";
import { version } from "../../../package.json";

export function Footer(): JSX.Element {
  const isRunning = useAudioStore((state) => state.isRunning);
  const inputDeviceId = useAudioStore((state) => state.inputDeviceId);
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const [sampleRate, setSampleRate] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      setSampleRate(null);
      return;
    }
    const timeoutId = setTimeout(() => {
      setSampleRate(AudioEngine.getInstance().getSampleRate());
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [isRunning, inputDeviceId, outputDeviceId]);

  const formatSampleRate = (rate: number): string =>
    rate >= 1000
      ? `${(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)} kHz`
      : `${rate} Hz`;

  return (
    <div className="flex items-center gap-4 px-6 py-3 font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground">
      <span className="min-w-0 flex-1 truncate">
        in <b className="font-medium text-foreground">line</b> &middot; out{" "}
        <b className="font-medium text-foreground">
          {outputDeviceId ? "device" : "default"}
        </b>
        {sampleRate && <> &middot; {formatSampleRate(sampleRate)}</>}
      </span>
      <span className="w-[64px] flex-shrink-0 text-center uppercase tracking-[0.1em]">
        {isRunning ? "ready" : "standby"}
      </span>
      <span className="w-[48px] flex-shrink-0 text-right">v{version}</span>
    </div>
  );
}
