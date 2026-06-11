/**
 * TEToggleButton - On/off control with a consistent three-state language:
 * disabled = inert, off = outline, on = filled accent. An icon conveys identity
 * so toggles are scannable rather than looking all alike.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TEToggleButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  disabled?: boolean;
  title?: string;
  size?: "sm" | "md";
}

export function TEToggleButton({
  label,
  active,
  onClick,
  icon: Icon,
  disabled = false,
  title,
  size = "sm",
}: TEToggleButtonProps): JSX.Element {
  const state = disabled
    ? "cursor-not-allowed border-border bg-popover text-muted-foreground/40"
    : active
      ? "border-brand bg-brand text-brand-foreground"
      : "border-border bg-popover text-muted-foreground hover:text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      role="switch"
      aria-checked={active}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "sm" ? "h-8 px-2.5 text-[10px]" : "h-9 px-3 text-[10.5px]",
        state,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}
