/**
 * VerticalSlider - Vertical fader control with center at 0 dB
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
}

const ACCENT_COLOR = "#F59E0B";
const TRACK_COLOR = "#18181B";

export function VerticalSlider({
  label,
  value,
  minDb,
  maxDb,
  centerDb,
  step = 0.5,
  height = 180,
  onChange,
  defaultValue,
}: VerticalSliderProps): JSX.Element {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const dbToPosition = useCallback(
    (db: number): number => {
      if (db <= centerDb) {
        return ((db - minDb) / (centerDb - minDb)) * 50;
      } else {
        return 50 + ((db - centerDb) / (maxDb - centerDb)) * 50;
      }
    },
    [minDb, maxDb, centerDb],
  );

  const positionToDb = useCallback(
    (position: number): number => {
      if (position <= 50) {
        return minDb + (position / 50) * (centerDb - minDb);
      } else {
        return centerDb + ((position - 50) / 50) * (maxDb - centerDb);
      }
    },
    [minDb, maxDb, centerDb],
  );

  const currentPosition = dbToPosition(value);

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
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  const thumbSize = 20;
  const trackWidth = 8;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={sliderRef}
        className="relative cursor-pointer"
        style={{ width: 32, height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Track background */}
        <div
          className="absolute left-1/2 rounded-full"
          style={{
            width: trackWidth,
            height: "100%",
            transform: "translateX(-50%)",
            background: TRACK_COLOR,
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.4)",
          }}
        />

        {/* Active fill (from bottom) */}
        <div
          className="absolute left-1/2 rounded-full"
          style={{
            width: trackWidth,
            height: `${currentPosition}%`,
            bottom: 0,
            transform: "translateX(-50%)",
            background: ACCENT_COLOR,
            boxShadow: `0 0 8px ${ACCENT_COLOR}40`,
          }}
        />

        {/* Thumb */}
        <div
          className="absolute left-1/2 transition-transform duration-75"
          style={{
            width: thumbSize,
            height: thumbSize,
            bottom: `calc(${currentPosition}% - ${thumbSize / 2}px)`,
            transform: "translateX(-50%)",
            background: "radial-gradient(circle at 30% 30%, #FAFAFA, #D4D4D8)",
            borderRadius: "50%",
            boxShadow:
              "0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.3)",
          }}
        />
      </div>

      <label className="text-xs text-text-secondary">{label}</label>
    </div>
  );
}
