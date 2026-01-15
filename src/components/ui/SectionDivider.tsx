/**
 * SectionDivider - Decorative divider with centered text
 */

import { useThemeStore } from "../../store/useThemeStore";

interface SectionDividerProps {
  text?: string;
  className?: string;
}

export function SectionDivider({
  text,
  className = "",
}: SectionDividerProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  if (theme !== "vintage") {
    // Modern theme: simple divider
    return (
      <div className={`flex items-center gap-4 my-4 ${className}`}>
        <div className="flex-1 h-px bg-white/10" />
        {text && (
          <span className="text-xs text-text-tertiary uppercase tracking-wider">
            {text}
          </span>
        )}
        <div className="flex-1 h-px bg-white/10" />
      </div>
    );
  }

  return (
    <div className={`section-divider ${className}`}>
      <div className="divider-line" />
      {text && <span className="divider-text">{text}</span>}
      <div className="divider-line" />
    </div>
  );
}
