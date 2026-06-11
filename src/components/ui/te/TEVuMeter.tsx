/**
 * TEVuMeter - Flat, TE/Braun-styled analog VU instrument with a large, shallow
 * arc, fine major/minor ticks, a corner peak ("+") indicator with a clip LED,
 * and dual L/R needles. DSP preserved: -20..+3 VU, -18 dBFS reference, IEC-style
 * ballistics, peak hold/fade.
 */

import { useEffect, useMemo, useRef } from "react";
import { linearToDb } from "../../../utils/dsp-math";

interface TEVuMeterProps {
  analyserLeft: AnalyserNode | null;
  analyserRight: AnalyserNode | null;
}

// Geometry: large radius, center far below the viewBox -> shallow, wide arc.
const W = 380;
const H = 162;
const CX = 190;
const CY = 300;
const R = 268;
const NEEDLE_LEN = 250;
const MIN_ANGLE = -30;
const MAX_ANGLE = 30;

// VU scale + calibration (preserved).
const MIN_VU = -20;
const MAX_VU = 3;
const VU_REFERENCE_DBFS = -18;
const ATTACK_TIME = 65;
const RELEASE_TIME = 65;
const PEAK_THRESHOLD_VU = 0;
const PEAK_HOLD = 1000;
const PEAK_FALL = 1500;

const MAJOR_TICKS = [
  { vu: -20, label: "20" },
  { vu: -10, label: "10" },
  { vu: -7, label: "7" },
  { vu: -5, label: "5" },
  { vu: -3, label: "3" },
  { vu: 0, label: "0" },
  { vu: 3, label: "+3" },
];
const MINOR_TICKS = [-18, -16, -14, -12, -8, -6, -4, -2, -1, 1, 2];

const angleOf = (vu: number): number =>
  MIN_ANGLE + ((vu - MIN_VU) / (MAX_VU - MIN_VU)) * (MAX_ANGLE - MIN_ANGLE);

const point = (angleDeg: number, r: number): [number, number] => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
};

const arc = (r: number, fromDeg: number, toDeg: number): string => {
  const [sx, sy] = point(fromDeg, r);
  const [ex, ey] = point(toDeg, r);
  return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
};

export function TEVuMeter({
  analyserLeft,
  analyserRight,
}: TEVuMeterProps): JSX.Element {
  const needleLRef = useRef<SVGLineElement>(null);
  const needleRRef = useRef<SVGLineElement>(null);
  const peakRef = useRef<SVGCircleElement>(null);
  const rafRef = useRef<number>();
  const angleLRef = useRef(MIN_ANGLE);
  const angleRRef = useRef(MIN_ANGLE);
  const lastTimeRef = useRef(Date.now());
  const peakLevelRef = useRef(0);
  const peakHoldRef = useRef(0);

  const majorTicks = useMemo(
    () =>
      MAJOR_TICKS.map(({ vu, label }) => {
        const a = angleOf(vu);
        const [x1, y1] = point(a, R);
        const [x2, y2] = point(a, R - 16);
        const [lx, ly] = point(a, R - 32);
        return { label, x1, y1, x2, y2, lx, ly };
      }),
    [],
  );

  const minorTicks = useMemo(
    () =>
      MINOR_TICKS.map((vu) => {
        const a = angleOf(vu);
        const [x1, y1] = point(a, R);
        const [x2, y2] = point(a, R - 9);
        return { x1, y1, x2, y2 };
      }),
    [],
  );

  useEffect(() => {
    const rest = (): void => {
      const t = `rotate(${MIN_ANGLE}deg)`;
      if (needleLRef.current) needleLRef.current.style.transform = t;
      if (needleRRef.current) needleRRef.current.style.transform = t;
      if (peakRef.current) peakRef.current.style.opacity = "0";
    };

    if (!analyserLeft || !analyserRight) {
      rest();
      return;
    }

    const bufL = new Float32Array(analyserLeft.fftSize);
    const bufR = new Float32Array(analyserRight.fftSize);

    const measure = (
      analyser: AnalyserNode,
      buf: Float32Array<ArrayBuffer>,
    ): { rms: number; peak: number } => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const s = buf[i];
        sum += s * s;
        const a = Math.abs(s);
        if (a > peak) peak = a;
      }
      return { rms: Math.sqrt(sum / buf.length), peak };
    };

    const vuToAngle = (vu: number): number =>
      angleOf(Math.max(MIN_VU, Math.min(MAX_VU, vu)));

    const draw = (): void => {
      rafRef.current = requestAnimationFrame(draw);

      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const left = measure(analyserLeft, bufL);
      const right = measure(analyserRight, bufR);

      const vuL = linearToDb(left.rms) - VU_REFERENCE_DBFS;
      const vuR = linearToDb(right.rms) - VU_REFERENCE_DBFS;
      const peakVu =
        linearToDb(Math.max(left.peak, right.peak)) - VU_REFERENCE_DBFS;

      const smooth = (current: number, target: number): number => {
        const tau = target > current ? ATTACK_TIME : RELEASE_TIME;
        return current + (target - current) * (1 - Math.exp(-dt / tau));
      };
      angleLRef.current = smooth(angleLRef.current, vuToAngle(vuL));
      angleRRef.current = smooth(angleRRef.current, vuToAngle(vuR));

      if (needleLRef.current)
        needleLRef.current.style.transform = `rotate(${angleLRef.current}deg)`;
      if (needleRRef.current)
        needleRRef.current.style.transform = `rotate(${angleRRef.current}deg)`;

      if (peakVu >= PEAK_THRESHOLD_VU) {
        peakLevelRef.current = 1;
        peakHoldRef.current = now;
      } else {
        const since = now - peakHoldRef.current;
        if (since > PEAK_HOLD) {
          peakLevelRef.current = Math.max(
            0,
            1 - (since - PEAK_HOLD) / PEAK_FALL,
          );
        }
      }
      if (peakRef.current)
        peakRef.current.style.opacity = peakLevelRef.current.toFixed(2);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      angleLRef.current = MIN_ANGLE;
      angleRRef.current = MIN_ANGLE;
      peakLevelRef.current = 0;
    };
  }, [analyserLeft, analyserRight]);

  const needleStyle = {
    transformOrigin: `${CX}px ${CY}px`,
    transform: `rotate(${MIN_ANGLE}deg)`,
  } as const;

  // "+" sits where the next mark would fall on the scale (continuation past +3),
  // at the same radius as the tick labels, without extending the arc.
  const [plusX, plusY] = point(38, R - 32);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="meter"
      aria-label="Input VU meter"
      aria-valuemin={MIN_VU}
      aria-valuemax={MAX_VU}
      aria-valuenow={0}
    >
      {/* Arc + red zone */}
      <path d={arc(R, MIN_ANGLE, MAX_ANGLE)} className="fill-none stroke-border" strokeWidth={1} />
      <path
        d={arc(R, angleOf(0), MAX_ANGLE)}
        className="fill-none stroke-brand"
        strokeWidth={1.6}
        opacity={0.9}
      />

      {/* Minor ticks */}
      {minorTicks.map((t, i) => (
        <line
          key={`mn-${i}`}
          x1={t.x1.toFixed(1)}
          y1={t.y1.toFixed(1)}
          x2={t.x2.toFixed(1)}
          y2={t.y2.toFixed(1)}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}

      {/* Major ticks + labels */}
      {majorTicks.map((t, i) => (
        <g key={`mj-${i}`}>
          <line
            x1={t.x1.toFixed(1)}
            y1={t.y1.toFixed(1)}
            x2={t.x2.toFixed(1)}
            y2={t.y2.toFixed(1)}
            className="stroke-foreground"
            strokeWidth={1.4}
          />
          <text
            x={t.lx.toFixed(1)}
            y={(t.ly + 3).toFixed(1)}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            style={{ fontSize: "9px" }}
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Needles (R behind, L on top), faded out toward the base so they
          materialize instead of emerging from a hard edge. */}
      <defs>
        <linearGradient id="vuNeedleFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" />
          <stop offset="0.62" stopColor="white" />
          <stop offset="0.92" stopColor="black" />
        </linearGradient>
        <mask id="vuNeedleMask">
          <rect x="0" y="0" width={W} height={H} fill="url(#vuNeedleFade)" />
        </mask>
      </defs>
      <g mask="url(#vuNeedleMask)">
        <line
          ref={needleRRef}
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - NEEDLE_LEN}
          className="stroke-muted-foreground"
          strokeWidth={1.4}
          strokeLinecap="round"
          style={needleStyle}
        />
        <line
          ref={needleLRef}
          x1={CX}
          y1={CY}
          x2={CX}
          y2={CY - NEEDLE_LEN}
          className="stroke-foreground"
          strokeWidth={1.6}
          strokeLinecap="round"
          style={needleStyle}
        />
      </g>

      {/* Name */}
      <text
        x={CX}
        y={H - 8}
        textAnchor="middle"
        className="fill-muted-foreground font-sans font-semibold"
        style={{ fontSize: "11px", letterSpacing: "0.4em" }}
      >
        VU
      </text>

      {/* "+" on the scale continuation, clip LED at the VU label height */}
      <g>
        <text
          x={plusX.toFixed(1)}
          y={(plusY + 4).toFixed(1)}
          textAnchor="middle"
          className="fill-brand font-mono font-semibold"
          style={{ fontSize: "13px" }}
        >
          +
        </text>
        <circle
          ref={peakRef}
          cx={plusX.toFixed(1)}
          cy={H - 12}
          r={5}
          className="fill-brand"
          style={{ opacity: 0 }}
        />
        <circle
          cx={plusX.toFixed(1)}
          cy={H - 12}
          r={7}
          className="fill-none stroke-border"
          strokeWidth={1.2}
        />
      </g>
    </svg>
  );
}
