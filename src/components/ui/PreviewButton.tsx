/**
 * PreviewButton - Play/stop action for the demo audio. Styled as an action
 * (not a toggle): outline when idle, filled accent while playing.
 */

import { Play, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function PreviewButton({
  isPlaying,
  isLoading,
  disabled,
  onToggle,
}: PreviewButtonProps): JSX.Element {
  const inert = disabled || isLoading;

  return (
    <button
      onClick={onToggle}
      disabled={inert}
      className={cn(
        "inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed border-border bg-popover text-muted-foreground/40",
        !disabled && isPlaying && "border-brand bg-brand text-brand-foreground",
        !disabled && !isPlaying && "border-border bg-popover text-muted-foreground hover:text-foreground",
      )}
      title="Play demo audio through the signal chain"
      aria-label={
        isLoading ? "Loading preview" : isPlaying ? "Stop preview" : "Play preview"
      }
      aria-pressed={isPlaying}
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
      ) : isPlaying ? (
        <Square className="size-3.5 fill-current" strokeWidth={2} />
      ) : (
        <Play className="size-3.5 fill-current" strokeWidth={2} />
      )}
      {isLoading ? "Load" : isPlaying ? "Stop" : "Preview"}
    </button>
  );
}
