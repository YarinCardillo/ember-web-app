/**
 * HeaderMenu - Dropdown in the device head: input / output device pickers under
 * Settings, plus the setup guide and about panel.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface HeaderMenuProps {
  onSetupGuide: () => void;
  onAbout: () => void;
  inputDevices: DeviceInfo[];
  inputDeviceId: string | null;
  onInputDeviceChange: (deviceId: string) => void;
  outputDevices: DeviceInfo[];
  outputDeviceId: string | null;
  onOutputDeviceChange: (deviceId: string) => void;
  isOutputDeviceSupported: boolean;
  isMobileMode: boolean;
}

const SELECT_CLASS =
  "w-full rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function HeaderMenu({
  onSetupGuide,
  onAbout,
  inputDevices,
  inputDeviceId,
  onInputDeviceChange,
  outputDevices,
  outputDeviceId,
  onOutputDeviceChange,
  isOutputDeviceSupported,
  isMobileMode,
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
        className={cn(
          "flex size-8 items-center justify-center transition-colors focus-visible:outline-none",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {/* Two bars that rotate into a thin X on open */}
        <span className="relative block h-3 w-[18px]" aria-hidden="true">
          <span
            className={cn(
              "absolute left-0 block h-[1.4px] w-[18px] bg-current transition-all duration-300 ease-out",
              open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[3px]",
            )}
          />
          <span
            className={cn(
              "absolute left-0 block h-[1.4px] w-[18px] bg-current transition-all duration-300 ease-out",
              open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-[3px]",
            )}
          />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Settings
            </p>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Input
            </label>
            {isMobileMode ? (
              <div className="mb-2.5 rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                Mic disabled on mobile
              </div>
            ) : (
              <select
                value={inputDeviceId || ""}
                onChange={(e) => {
                  if (e.target.value) onInputDeviceChange(e.target.value);
                }}
                className={`mb-2.5 ${SELECT_CLASS}`}
              >
                <option value="" disabled>
                  Select input...
                </option>
                {inputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            )}

            <label className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Output
            </label>
            {isMobileMode ? (
              <div className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                Default (mobile)
              </div>
            ) : isOutputDeviceSupported ? (
              <select
                value={outputDeviceId || "default"}
                onChange={(e) => onOutputDeviceChange(e.target.value)}
                className={SELECT_CLASS}
              >
                {outputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-mono text-[11px] text-muted-foreground">
                Not supported in this browser
              </p>
            )}
          </div>

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
