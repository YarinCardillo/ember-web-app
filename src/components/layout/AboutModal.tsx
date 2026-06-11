/**
 * AboutModal - Project info, credits, and external links. Moved out of the main
 * device UI; opened from the header menu.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { version } from "../../../package.json";

interface AboutModalProps {
  onClose: () => void;
}

const LINKS = [
  { label: "GitHub", href: "https://github.com/YarinCardillo/ember-web-app" },
  { label: "Portfolio", href: "https://yarincardillo.com/" },
  { label: "Support", href: "https://buymeacoffee.com/yarincardillo" },
];

export function AboutModal({ onClose }: AboutModalProps): JSX.Element {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          className="absolute inset-0 bg-foreground/20"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
        <motion.div
          className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                About
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                valve amplifier
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3 p-5 text-sm">
            <p className="leading-relaxed text-foreground">
              HF-1 is a browser-based HiFi amplifier simulator with
              real-time DSP processing. All audio processing happens locally in
              your browser using the Web Audio API. Open source on GitHub.
              Supported for Chromium-based desktop browsers only.
            </p>
            <p className="italic text-muted-foreground">
              To my audiophile friend Luigi.
            </p>

            <div className="border-t border-border pt-3">
              <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Tech Stack
              </h4>
              <p className="text-foreground">
                React + TypeScript + Web Audio API + AudioWorklet + Zustand +
                Tailwind CSS
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-4">
                {LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                v{version}
              </span>
            </div>

            <span className="font-mono text-[10px] text-muted-foreground/70">
              Made with care by Yarin Cardillo
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
