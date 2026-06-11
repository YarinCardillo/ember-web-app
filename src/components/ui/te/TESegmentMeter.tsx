/**
 * TESegmentMeter - Segmented horizontal output meter. Lit segments show their
 * vivid zone color (green / yellow / red); unlit segments sit at a faint neutral.
 * Colors, the scale labels and the signal all share one linear dB mapping, so
 * zone boundaries line up with their labels. Peak/ballistics preserved.
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../../utils/dsp-math";

interface TESegmentMeterProps {
  analyserLeft: AnalyserNode | null;
  analyserRight: AnalyserNode | null;
  segments?: number;
  minDb?: number;
  maxDb?: number;
}

// Mockup colors: lit = ink, hot (clip zone) = accent, with a softer pre-clip
// gradation in the few segments just below the hot zone. Segments are always
// visible at a low opacity; the signal raises lit ones to full opacity.
const HOT_DB = 0;
const PRECLIP_DB = -9; // ~3 segments below the hot zone
const INK = "hsl(var(--foreground))";
const ACCENT = "hsl(var(--brand))";
const PRECLIP = "hsl(222 9% 52%)"; // sidereal grey (cool steel)
const REST_OPACITY = "0.2";

const ATTACK_TIME = 5;
const RELEASE_TIME = 100;
const SCALE_MARKS = [-60, -36, -24, -12, 0, 6];

export function TESegmentMeter({
  analyserLeft,
  analyserRight,
  segments = 20,
  minDb = -60,
  maxDb = 6,
}: TESegmentMeterProps): JSX.Element {
  const segRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const smoothedDbRef = useRef(minDb);
  const lastTimeRef = useRef(Date.now());
  const rafRef = useRef<number>();

  const range = maxDb - minDb;

  // Static color per segment: accent (hot), softer pre-clip, else ink.
  const segColor = (i: number): string => {
    const center = minDb + ((i + 0.5) / segments) * range;
    if (center >= HOT_DB) return ACCENT;
    if (center >= PRECLIP_DB) return PRECLIP;
    return INK;
  };

  useEffect(() => {
    const paint = (levelDb: number): void => {
      for (let i = 0; i < segments; i++) {
        const el = segRefs.current[i];
        if (!el) continue;
        const segDb = minDb + ((i + 0.5) / segments) * range;
        el.style.opacity = levelDb >= segDb ? "1" : REST_OPACITY;
      }
    };

    if (!analyserLeft) {
      paint(minDb);
      return;
    }

    const bufL = new Float32Array(analyserLeft.fftSize);
    const bufR = analyserRight ? new Float32Array(analyserRight.fftSize) : null;

    const draw = (): void => {
      rafRef.current = requestAnimationFrame(draw);

      analyserLeft.getFloatTimeDomainData(bufL);
      if (analyserRight && bufR) analyserRight.getFloatTimeDomainData(bufR);

      let peak = 0;
      for (let i = 0; i < bufL.length; i++) {
        const a = Math.abs(bufL[i]);
        if (a > peak) peak = a;
      }
      if (bufR) {
        for (let i = 0; i < bufR.length; i++) {
          const a = Math.abs(bufR[i]);
          if (a > peak) peak = a;
        }
      }

      const targetDb = Math.max(minDb, Math.min(maxDb, linearToDb(peak)));
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const tau = targetDb > smoothedDbRef.current ? ATTACK_TIME : RELEASE_TIME;
      smoothedDbRef.current +=
        (targetDb - smoothedDbRef.current) * (1 - Math.exp(-dt / tau));

      paint(smoothedDbRef.current);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyserLeft, analyserRight, segments, minDb, maxDb]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-[18px] items-end gap-[3px]">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            ref={(el) => (segRefs.current[i] = el)}
            className="h-full flex-1 rounded-[1px]"
            style={{ backgroundColor: segColor(i), opacity: REST_OPACITY }}
          />
        ))}
      </div>
      {/* Labels positioned by the same linear dB mapping as the segments. */}
      <div className="relative h-3 font-mono text-[9px] tracking-[0.04em] text-muted-foreground/80">
        {SCALE_MARKS.map((db) => {
          const pct = ((db - minDb) / range) * 100;
          return (
            <span
              key={db}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{
                left: `${pct}%`,
                ...(db === minDb && { left: "0", transform: "none" }),
                ...(db === maxDb && { left: "auto", right: "0", transform: "none" }),
              }}
            >
              {db > 0 ? `+${db}` : db}
            </span>
          );
        })}
      </div>
    </div>
  );
}
