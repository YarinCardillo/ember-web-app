/**
 * Screw - Decorative corner screw for vintage theme
 */

import { useThemeStore } from "../../store/useThemeStore";

interface ScrewProps {
  position: "tl" | "tr" | "bl" | "br";
}

export function Screw({ position }: ScrewProps): JSX.Element | null {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    return null;
  }

  return <div className={`screw ${position}`} />;
}

interface ScrewsProps {
  className?: string;
}

export function Screws({ className = "" }: ScrewsProps): JSX.Element | null {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    return null;
  }

  return (
    <div className={className}>
      <div className="screw tl" />
      <div className="screw tr" />
      <div className="screw bl" />
      <div className="screw br" />
    </div>
  );
}
