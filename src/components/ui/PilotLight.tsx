/**
 * PilotLight - Small pulsing LED indicator for section activation
 */

import { useThemeStore } from "../../store/useThemeStore";

interface PilotLightProps {
  active: boolean;
  className?: string;
}

export function PilotLight({
  active,
  className = "",
}: PilotLightProps): JSX.Element | null {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    return null;
  }

  return <div className={`pilot-light ${active ? "" : "off"} ${className}`} />;
}
