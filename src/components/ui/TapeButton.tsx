/**
 * TapeButton - Button with animated tape reel SVG
 */

import { memo } from "react";
import { TapeReel } from "./TapeReel";

interface TapeButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function TapeButtonComponent({
  checked,
  onChange,
  disabled = false,
}: TapeButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative flex items-center justify-center focus:outline-none w-16 h-16 ${disabled ? "cursor-not-allowed" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label="Tape Sim"
      title="Tape Sim"
    >
      <TapeReel active={checked && !disabled} size={60} />
    </button>
  );
}

// Memoize to prevent unnecessary re-renders from parent
export const TapeButton = memo(TapeButtonComponent);
