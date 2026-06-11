/**
 * HeaderMenu - Small dropdown in the device head for opening the setup guide
 * and the about panel.
 */

import { useEffect, useRef, useState } from "react";

interface HeaderMenuProps {
  onSetupGuide: () => void;
  onAbout: () => void;
}

export function HeaderMenu({
  onSetupGuide,
  onAbout,
}: HeaderMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (action: () => void): void => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-md border border-border bg-popover text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <line x1="1" y1="3.5" x2="13" y2="3.5" stroke="currentColor" strokeWidth="1.4" />
          <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.4" />
          <line x1="1" y1="10.5" x2="13" y2="10.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-card shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => select(onSetupGuide)}
            className="block w-full px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary"
          >
            Setup Guide
          </button>
          <button
            role="menuitem"
            onClick={() => select(onAbout)}
            className="block w-full px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-secondary"
          >
            About
          </button>
        </div>
      )}
    </div>
  );
}
