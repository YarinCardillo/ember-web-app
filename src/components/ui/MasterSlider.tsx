/**
 * MasterSlider - Non-linear horizontal fader with center at 0 dB (TE flat style).
 * Left half maps minDb..centerDb, right half centerDb..maxDb.
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

  const formatDisplayValue = useCallback(
    (val: number): string =>
      formatValue ? formatValue(val) : `${val.toFixed(1)} dB`,
    [formatValue],
  );

  const currentPosition = dbToPosition(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const position = parseFloat(e.target.value);
    const rounded = Math.round(positionToDb(position) / step) * step;
    onChange(rounded);
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) onChange(defaultValue);
  }, [defaultValue, onChange]);

  return (
    <div className="flex w-full flex-col gap-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </label>
          )}
          {showValue && (
            <span className="ml-auto font-mono text-[11px] tabular-nums text-foreground">
              {renderDbValue(formatDisplayValue(value))}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={currentPosition}
        onChange={handleChange}
        onDoubleClick={handleDoubleClick}
        aria-label={label || "Master level"}
        className="te-fader h-5 w-full cursor-pointer appearance-none bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      />
    </div>
  );
}
