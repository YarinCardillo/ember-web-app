/**
 * LcdDisplay - Vintage LCD display panel for output level
 */

import { useThemeStore } from "../../store/useThemeStore";

interface LcdDisplayProps {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}

export function LcdDisplay({
  label,
  value,
  unit = "",
  className = "",
}: LcdDisplayProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    // Modern theme: simple display
    return (
      <div className={`text-center ${className}`}>
        <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">
          {label}
        </div>
        <div className="font-mono text-2xl text-accent-primary">
          {value}
          {unit && (
            <span className="text-sm text-text-secondary ml-1">{unit}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`lcd-display ${className}`}>
      <div className="lcd-label text-center">{label}</div>
      <div className="lcd-value text-center mt-2">
        {value}
        {unit && <span className="lcd-unit">{unit}</span>}
      </div>
    </div>
  );
}
