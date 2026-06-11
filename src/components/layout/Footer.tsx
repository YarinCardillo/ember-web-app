/**
 * Footer - Device foot bar (mockup layout): signal route, engine state, version.
 */

import { useState, useEffect } from "react";
import { useAudioStore } from "../../store/useAudioStore";
import { useUiThemeStore, type UiTheme } from "../../store/useUiThemeStore";
import { TextMorph } from "../ui/te/TextMorph";
import AudioEngine from "../../audio/AudioEngine";
import { version } from "../../../package.json";

const THEME_LABEL: Record<UiTheme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function ThemeSwitch(): JSX.Element {
  const theme = useUiThemeStore((state) => state.theme);
  const cycleTheme = useUiThemeStore((state) => state.cycleTheme);

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to cycle.`}
      className="rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TextMorph>{THEME_LABEL[theme]}</TextMorph>
    </button>
  );
}

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
      <span className="h-4 w-px flex-shrink-0 bg-border" />
      <ThemeSwitch />
    </div>
  );
}
