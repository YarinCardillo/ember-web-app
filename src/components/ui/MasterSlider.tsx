/**
 * MasterSlider - Non-linear fader control with center at 0 dB
 * Left half: -96 dB to 0 dB
 * Right half: 0 dB to +6 dB
 */

import { useCallback } from "react";

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
}

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
}: MasterSliderProps): JSX.Element {
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

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center">
        <label className="text-xs text-text-secondary">{label}</label>
        <span className="text-xs font-mono text-accent-primary">
          {formatDisplayValue(value)}
        </span>
      </div>
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
