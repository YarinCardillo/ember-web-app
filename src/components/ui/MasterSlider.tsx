/**
 * MasterSlider - Non-linear fader control with center at 0 dB
 * Left half: -96 dB to 0 dB
 * Right half: 0 dB to +6 dB
 */

import { useCallback, useMemo } from 'react';

interface MasterSliderProps {
  label: string;
  value: number;
  minDb: number;     // -96 dB
  maxDb: number;     // +6 dB
  centerDb: number;  // 0 dB
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  defaultValue?: number;
}

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
  // Map dB value to slider position (0-100)
  const dbToPosition = useCallback(
    (db: number): number => {
      if (db <= centerDb) {
        // Left half: minDb to centerDb -> 0 to 50
        return ((db - minDb) / (centerDb - minDb)) * 50;
      } else {
        // Right half: centerDb to maxDb -> 50 to 100
        return 50 + ((db - centerDb) / (maxDb - centerDb)) * 50;
      }
    },
    [minDb, maxDb, centerDb]
  );

  // Map slider position (0-100) to dB value
  const positionToDb = useCallback(
    (position: number): number => {
      if (position <= 50) {
        // Left half: 0 to 50 -> minDb to centerDb
        return minDb + (position / 50) * (centerDb - minDb);
      } else {
        // Right half: 50 to 100 -> centerDb to maxDb
        return centerDb + ((position - 50) / 50) * (maxDb - centerDb);
      }
    },
    [minDb, maxDb, centerDb]
  );

  const formatDisplayValue = useCallback(
    (val: number): string => {
      if (formatValue) {
        return formatValue(val);
      }
      return `${val.toFixed(1)} dB`;
    },
    [formatValue]
  );

  const currentPosition = dbToPosition(value);

  // Get CSS variable for ember-orange color
  const emberOrange = useMemo(() => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue('--ember-orange').trim() || '#ff6b35';
    }
    return '#ff6b35';
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const position = parseFloat(e.target.value);
    const dbValue = positionToDb(position);
    
    // Apply step rounding uniformly
    const rounded = Math.round(dbValue / step) * step;
    onChange(rounded);
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

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
          min={0}
          max={100}
          step={0.1}
          value={currentPosition}
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
            background: `linear-gradient(to right, ${emberOrange} 0%, ${emberOrange} ${currentPosition}%, #374151 ${currentPosition}%, #374151 100%)`,
          }}
        />
      </div>
    </div>
  );
}

