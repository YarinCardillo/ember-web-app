/**
 * Ventilation - Decorative ventilation slots for vintage theme
 */

import { useThemeStore } from "../../store/useThemeStore";

interface VentilationProps {
  slots?: number;
  className?: string;
}

export function Ventilation({
  slots = 8,
  className = "",
}: VentilationProps): JSX.Element | null {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    return null;
  }

  return (
    <div className={`ventilation ${className}`}>
      {Array.from({ length: slots }).map((_, i) => (
        <div key={i} className="vent-slot" />
      ))}
    </div>
  );
}
