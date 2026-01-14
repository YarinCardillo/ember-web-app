/**
 * PilotLight - Small pulsing LED indicator for section activation
 */

import { useThemeStore } from "../../store/useThemeStore";

interface PilotLightProps {
  isActive: boolean;
  className?: string;
}

export function PilotLight({
  isActive,
  className = "",
}: PilotLightProps): JSX.Element | null {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    return null;
  }

  return <div className={`pilot-light ${isActive ? "" : "off"} ${className}`} />;
}
