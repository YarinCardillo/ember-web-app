/**
 * VerticalSlider - Vertical fader control with center at 0 dB (TE flat style).
 */

import { useCallback, useRef } from "react";

interface VerticalSliderProps {
  label: string;
  value: number;
  minDb: number;
  maxDb: number;
  centerDb: number;
  step?: number;
  height?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  defaultValue?: number;
  showValue?: boolean;
}

/** dB value readout with the numeric part in a fixed-width span so the unit
 *  never shifts as digit count changes. */
const renderDbValue = (str: string): React.ReactNode => {
  const i = str.lastIndexOf("dB");
  if (i === -1) return str;
  return (
    <span className="inline-flex items-baseline gap-[0.2em]">
      <span className="inline-block min-w-[5ch] text-right tabular-nums">
        {str.slice(0, i).trim()}
      </span>
      <span className="text-muted-foreground">dB</span>
    </span>
  );
};

export function VerticalSlider({
  label,
  value,
  minDb,
  maxDb,
  centerDb,
  step = 0.5,
  height = 180,
  formatValue,
  onChange,
  defaultValue,
  showValue = false,
}: VerticalSliderProps): JSX.Element {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const dbToPosition = useCallback(
    (db: number): number => {
      if (db <= centerDb) {
        return ((db - minDb) / (centerDb - minDb)) * 50;
      }
      return 50 + ((db - centerDb) / (maxDb - centerDb)) * 50;
    },
    [minDb, maxDb, centerDb],
  );

  const positionToDb = useCallback(
    (position: number): number => {
      if (position <= 50) {
        return minDb + (position / 50) * (centerDb - minDb);
      }
      return centerDb + ((position - 50) / 50) * (maxDb - centerDb);
    },
    [minDb, maxDb, centerDb],
  );

  const currentPosition = dbToPosition(value);

  const formatDisplayValue = useCallback(
    (val: number): string => {
      if (formatValue) return formatValue(val);
      if (val <= -90) return "-Inf dB";
      return `${val.toFixed(1)} dB`;
    },
    [formatValue],
  );

  const handlePointerEvent = useCallback(
    (clientY: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      const position = Math.max(
        0,
        Math.min(100, (1 - relativeY / rect.height) * 100),
      );
      const dbValue = positionToDb(position);
      const rounded = Math.round(dbValue / step) * step;
      onChange(rounded);
    },
    [positionToDb, step, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerEvent(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    handlePointerEvent(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) onChange(defaultValue);
  }, [defaultValue, onChange]);

  const thumbSize = 16;
  const trackWidth = 3;
  const touchTargetWidth = 44;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={sliderRef}
        className="relative cursor-pointer touch-none"
        style={{ width: touchTargetWidth, height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Track background */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-border"
          style={{ width: trackWidth, height: "100%" }}
        />
        {/* Active fill (from bottom) */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-foreground"
          style={{ width: trackWidth, height: `${currentPosition}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute left-1/2 rounded-[3px] bg-foreground transition-transform duration-75"
          style={{
            width: thumbSize - 4,
            height: thumbSize + 6,
            bottom: `calc(${currentPosition}% - ${(thumbSize + 6) / 2}px)`,
            transform: "translateX(-50%)",
            border: "2px solid hsl(var(--card))",
            boxShadow: "0 0 0 1px hsl(var(--foreground))",
          }}
        />
      </div>

      {showValue && (
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {renderDbValue(formatDisplayValue(value))}
        </span>
      )}
      {label && (
        <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </label>
      )}
    </div>
  );
}
