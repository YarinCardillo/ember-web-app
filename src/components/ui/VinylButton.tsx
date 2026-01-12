/**
 * VinylButton - Button with animated vinyl disc SVG
 */

import { memo } from "react";
import { VinylDisc } from "./VinylDisc";

interface VinylButtonProps {
  active: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  disabled?: boolean;
}

function VinylButtonComponent({
  active,
  onActivate,
  onDeactivate,
  disabled = false,
}: VinylButtonProps): JSX.Element {
  const handleClick = () => {
    if (disabled) return;
    if (active) {
      onDeactivate?.();
    } else {
      onActivate?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`relative flex items-center justify-center focus:outline-none w-14 h-14 ${disabled ? "cursor-not-allowed" : ""}`}
      role="switch"
      aria-checked={active}
      aria-label="Vinyl Mode"
      title="Vinyl Mode"
    >
      <VinylDisc active={active} size={56} />
    </button>
  );
}

export const VinylButton = memo(VinylButtonComponent);
