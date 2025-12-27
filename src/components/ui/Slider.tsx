/**
 * Slider - Linear fader control
 */

import { useCallback } from 'react';

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

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
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
    [formatValue, unit]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(parseFloat(e.target.value));
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  // Calculate fill percentage for styling
  const fillPercent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center">
        <label className="text-xs text-text-light opacity-80">{label}</label>
        <span className="text-xs font-mono text-ember-orange">
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
            w-full h-2 appearance-none cursor-pointer
            bg-gray-700 rounded-full
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-orange
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-ember-orange
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:hover:bg-amber-glow
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-ember-orange
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:cursor-pointer
          "
          style={{
            background: `linear-gradient(to right, #ff6b35 0%, #ff6b35 ${fillPercent}%, #374151 ${fillPercent}%, #374151 100%)`,
          }}
        />
      </div>
    </div>
  );
}

