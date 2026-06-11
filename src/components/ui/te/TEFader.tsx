/**
 * TEFader - Horizontal inline fader in the mockup style: [label][track][value].
 * Linear mapping across [min, max] (0 sits at the midpoint for symmetric ranges).
 */

import { useCallback } from "react";

interface TEFaderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  defaultValue?: number;
}

/** dB readout with the numeric part in a fixed-width span so the unit and the
 *  right edge never shift as digit count changes. */
const renderValue = (str: string): React.ReactNode => {
  const i = str.lastIndexOf(" ");
  if (i === -1) return <span className="tabular-nums">{str}</span>;
  return (
    <span className="inline-flex items-baseline gap-[0.2em]">
      <span className="inline-block min-w-[4ch] text-right tabular-nums">
        {str.slice(0, i)}
      </span>
      <span className="text-muted-foreground">{str.slice(i + 1)}</span>
    </span>
  );
};

export function TEFader({
  label,
  value,
  min,
  max,
  step = 0.5,
  formatValue,
  onChange,
  defaultValue,
}: TEFaderProps): JSX.Element {
  const display = formatValue ? formatValue(value) : `${value.toFixed(1)} dB`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(parseFloat(e.target.value));
  };

  const handleDoubleClick = useCallback((): void => {
    if (defaultValue !== undefined) onChange(defaultValue);
  }, [defaultValue, onChange]);

  return (
    <div className="flex w-full items-center gap-3.5">
      {label && (
        <span className="w-[54px] flex-shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        onDoubleClick={handleDoubleClick}
        aria-label={label}
        className="te-fader h-[22px] flex-1 cursor-pointer appearance-none bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      />
      <span className="w-[58px] flex-shrink-0 text-right font-mono text-[11px] text-foreground">
        {renderValue(display)}
      </span>
    </div>
  );
}
