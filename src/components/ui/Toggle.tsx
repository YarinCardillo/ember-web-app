/**
 * Toggle - Premium bypass switch with LED indicator and spring animation
 * Supports both modern and vintage themes
 */

import { motion } from "framer-motion";
import { useThemeStore } from "../../store/useThemeStore";

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";

  if (isVintage) {
    return (
      <div className="flex flex-col items-center gap-2">
        {label && <div className="text-xs text-text-secondary">{label}</div>}
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`toggle-3d ${checked ? "active" : ""}`}
          role="switch"
          aria-checked={checked}
          aria-label={label || "Toggle"}
        >
          {/* CSS handles the thumb via ::before pseudo-element */}
        </button>
      </div>
    );
  }

  // Modern theme
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <div className="text-xs text-text-secondary">{label}</div>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`
          relative w-14 h-7 rounded-full
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
          ${checked ? "bg-accent-primary" : "bg-bg-tertiary"}
        `}
        style={{
          boxShadow: checked
            ? "0 0 12px rgba(245, 158, 11, 0.4), inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            : "inset 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.05)",
        }}
        role="switch"
        aria-checked={checked}
        aria-label={label || "Toggle"}
      >
        {/* Toggle thumb with spring animation */}
        <motion.div
          className="absolute top-1 w-5 h-5 rounded-full"
          style={{
            background: "linear-gradient(145deg, #FAFAFA, #E5E7EB)",
            boxShadow:
              "0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
          }}
          initial={false}
          animate={{
            x: checked ? 30 : 4,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />

        {/* LED indicator */}
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          initial={false}
          animate={{
            backgroundColor: checked ? "#F59E0B" : "#3F3F46",
            boxShadow: checked
              ? "0 0 8px rgba(245, 158, 11, 0.8), 0 0 16px rgba(245, 158, 11, 0.4)"
              : "0 0 0 rgba(0, 0, 0, 0)",
          }}
          transition={{ duration: 0.2 }}
        />
      </button>
    </div>
  );
}
