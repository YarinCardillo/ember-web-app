/**
 * MasterSlider - Non-linear fader control with center at 0 dB
 * Left half: -96 dB to 0 dB
 * Right half: 0 dB to +6 dB
 * Supports both modern and vintage themes with brushed metal styling
 */

import { useCallback } from "react";
import { useThemeStore } from "../../store/useThemeStore";

interface MasterSliderProps {
  label: string;
  value: number;
  minDb: number;
  maxDb: number;
  centerDb: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  defaultValue?: number;
  showValue?: boolean;
}

// Modern theme colors
const ACCENT_COLOR = "#F59E0B";
const TRACK_COLOR = "#18181B";

export function MasterSlider({
  label,
  value,
  minDb,
  maxDb,
  centerDb,
  step = 0.5,
  formatValue,
  onChange,
  defaultValue,
  showValue = true,
}: MasterSliderProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";

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

  const formatDisplayValue = useCallback(
    (val: number): string => {
      if (formatValue) {
        return formatValue(val);
      }
      return `${val.toFixed(1)} dB`;
    },
    [formatValue],
  );

  const currentPosition = dbToPosition(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const position = parseFloat(e.target.value);
    const dbValue = positionToDb(position);
    const rounded = Math.round(dbValue / step) * step;
    onChange(rounded);
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  // Vintage brushed slider styling
  if (isVintage) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex justify-between items-center">
          <label className="slider-label-vintage">{label}</label>
          <span className="slider-value-vintage">{formatDisplayValue(value)}</span>
        </div>
        <div className="slider-brushed-h">
          <div
            className="track-fill"
            style={{ width: `${currentPosition}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={currentPosition}
            onChange={handleChange}
            onDoubleClick={handleDoubleClick}
            className="slider-input-vintage"
          />
        </div>
        <style>{`
          .slider-label-vintage {
            font-size: 9px;
            color: #4a4540;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .slider-value-vintage {
            font-family: 'Space Grotesk', monospace;
            font-size: 11px;
            color: #F5A524;
            background: rgba(0,0,0,0.4);
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(245, 165, 36, 0.2);
          }
          .slider-brushed-h {
            width: 100%;
            height: 12px;
            background: linear-gradient(180deg, #151510, #1a1815, #151510);
            border: 1px solid #2a2520;
            border-radius: 6px;
            position: relative;
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.6);
          }
          .slider-brushed-h .track-fill {
            position: absolute;
            top: 50%;
            left: 6px;
            transform: translateY(-50%);
            height: 4px;
            background: linear-gradient(to right, #22c55e, #4ade80);
            border-radius: 2px;
            box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
            pointer-events: none;
          }
          .slider-input-vintage {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            -webkit-appearance: none;
            appearance: none;
          }
          .slider-brushed-h::after {
            content: '';
            position: absolute;
            top: 50%;
            left: calc(${currentPosition}% - 9px);
            transform: translateY(-50%);
            width: 18px;
            height: 24px;
            background: conic-gradient(
              from 0deg,
              #353530 0deg, #252520 30deg,
              #353530 60deg, #252520 90deg,
              #353530 120deg, #252520 150deg,
              #353530 180deg, #252520 210deg,
              #353530 240deg, #252520 270deg,
              #353530 300deg, #252520 330deg,
              #353530 360deg
            );
            border-radius: 4px;
            border: 1px solid #3a3530;
            box-shadow:
              0 3px 6px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.05);
            pointer-events: none;
          }
          .slider-brushed-h::before {
            content: '';
            position: absolute;
            top: 50%;
            left: calc(${currentPosition}% - 1px);
            transform: translateY(-50%);
            width: 2px;
            height: 12px;
            background: #F5A524;
            border-radius: 1px;
            box-shadow: 0 0 4px rgba(245, 165, 36, 0.6);
            pointer-events: none;
            z-index: 1;
          }
        `}</style>
      </div>
    );
  }

  // Modern slider styling
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          <label className="text-xs text-text-secondary">{label}</label>
          {showValue && (
            <span className="text-xs font-mono text-accent-primary">
              {formatDisplayValue(value)}
            </span>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={currentPosition}
          onChange={handleChange}
          onDoubleClick={handleDoubleClick}
          className="
            w-full h-2 appearance-none cursor-pointer rounded-full
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:cursor-pointer
          "
          style={{
            background: `linear-gradient(to right, ${ACCENT_COLOR} 0%, ${ACCENT_COLOR} ${currentPosition}%, ${TRACK_COLOR} ${currentPosition}%, ${TRACK_COLOR} 100%)`,
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.4)",
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            background: radial-gradient(circle at 30% 30%, #FAFAFA, #D4D4D8);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.3);
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 8px rgba(245, 158, 11, 0.5);
          }
          input[type="range"]::-moz-range-thumb {
            background: radial-gradient(circle at 30% 30%, #FAFAFA, #D4D4D8);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.3);
          }
          input[type="range"]::-moz-range-thumb:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 8px rgba(245, 158, 11, 0.5);
          }
        `}</style>
      </div>
    </div>
  );
}
