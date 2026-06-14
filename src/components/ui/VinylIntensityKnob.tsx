/**
 * VinylIntensityKnob - Compact ring knob for vinyl intensity, intentionally
 * different from the main TE knobs: a 270-degree ring open at the bottom
 * quarter, with a dot riding the value. Vertical drag adjusts; double-click
 * resets to the 0.3 sweet spot.
 */

import { memo, useCallback, useRef } from "react";

const SIZE = 34;
const C = SIZE / 2;
const R = 12;
const START_ANGLE = -135; // value 0
const SWEEP = 270; // open quarter at the bottom
const SENSITIVITY = 0.005; // value change per pixel of vertical drag

const polar = (deg: number, radius: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
};

const arcPath = (fromDeg: number, toDeg: number, radius: number): string => {
  const [sx, sy] = polar(fromDeg, radius);
  const [ex, ey] = polar(toDeg, radius);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
};

interface VinylIntensityKnobProps {
  value: number;
  onChange: (value: number) => void;
}

function VinylIntensityKnobComponent({
  value,
  onChange,
}: VinylIntensityKnobProps): JSX.Element {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startValue.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dy = e.clientY - startY.current;
      const next = Math.max(
        0,
        Math.min(1, startValue.current - dy * SENSITIVITY),
      );
      onChange(Math.round(next * 100) / 100);
    },
    [onChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleDoubleClick = useCallback(() => onChange(0.3), [onChange]);

  const angle = START_ANGLE + value * SWEEP;
  const [dotX, dotY] = polar(angle, R);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="cursor-pointer touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      role="slider"
      aria-label="Vinyl intensity"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={value}
    >
      <path
        d={arcPath(START_ANGLE, START_ANGLE + SWEEP, R)}
        className="fill-none stroke-border"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={arcPath(START_ANGLE, angle, R)}
        className="fill-none stroke-foreground"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={dotX} cy={dotY} r={2.4} className="fill-foreground" />
    </svg>
  );
}

export const VinylIntensityKnob = memo(VinylIntensityKnobComponent);
