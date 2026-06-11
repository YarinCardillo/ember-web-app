/**
 * TEBay - A processing "bay" section inside the device panel (mockup layout).
 * Plain section with a label/aux header row and an optional action slot; column
 * dividers are provided by the parent grid, not by the bay itself.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TEBayProps {
  label: string;
  aux?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function TEBay({
  label,
  aux,
  action,
  className,
  contentClassName,
  children,
}: TEBayProps): JSX.Element {
  return (
    <section className={cn("flex flex-col px-6 py-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </span>
          {aux && (
            <span className="truncate font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70">
              {aux}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className={cn("flex flex-1 flex-col", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
