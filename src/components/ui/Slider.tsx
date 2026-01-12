/**
 * Slider - Premium linear fader control with enhanced styling
 */

import { useCallback } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  defaultValue?: number;
}

const ACCENT_COLOR = "#F59E0B";
const TRACK_COLOR = "#18181B";

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "",
  formatValue,
  onChange,
  defaultValue,
}: SliderProps): JSX.Element {
  const formatDisplayValue = useCallback(
    (val: number): string => {
      if (formatValue) {
        return formatValue(val);
      }
      return `${val.toFixed(1)}${unit}`;
    },
    [formatValue, unit],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(parseFloat(e.target.value));
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  const fillPercent = ((value - min) / (max - min)) * 100;

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
          min={min}
          max={max}
          step={step}
          value={value}
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
            background: `linear-gradient(to right, ${ACCENT_COLOR} 0%, ${ACCENT_COLOR} ${fillPercent}%, ${TRACK_COLOR} ${fillPercent}%, ${TRACK_COLOR} 100%)`,
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.4)",
          }}
        />
        {/* Custom thumb overlay for better styling control */}
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
