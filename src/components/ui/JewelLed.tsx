/**
 * JewelLed - Vintage jewel-style LED indicator
 */

import { useThemeStore } from "../../store/useThemeStore";

type LedColor = "green" | "amber" | "red" | "off";

interface JewelLedProps {
  color: LedColor;
  className?: string;
  label?: string;
}

export function JewelLed({
  color,
  className = "",
  label,
}: JewelLedProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    // Modern theme: simple LED
    const modernColors = {
      green: "#4ADE80",
      amber: "#F59E0B",
      red: "#F87171",
      off: "#3F3F46",
    };

    const glowColors = {
      green: "rgba(74, 222, 128, 0.6)",
      amber: "rgba(245, 158, 11, 0.6)",
      red: "rgba(248, 113, 113, 0.6)",
      off: "transparent",
    };

    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: modernColors[color],
            boxShadow:
              color !== "off" ? `0 0 8px ${glowColors[color]}` : "none",
          }}
        />
        {label && (
          <span className="text-[9px] text-text-tertiary uppercase tracking-wider">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`jewel-led ${color}`} />
      {label && (
        <span className="text-[9px] text-text-tertiary uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
