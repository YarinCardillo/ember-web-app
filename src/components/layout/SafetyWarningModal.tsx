/**
 * SafetyWarningModal - Warning modal for potential audio feedback loops (TE style).
 */

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/shadcn/button";

interface SafetyWarningModalProps {
  deviceName: string;
  onCancel: () => void;
  onContinue: () => void;
}

export function SafetyWarningModal({
  deviceName,
  onCancel,
  onContinue,
}: SafetyWarningModalProps): JSX.Element {
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-foreground/20"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onCancel}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="relative w-full max-w-md overflow-hidden rounded-xl border border-destructive/40 bg-card p-6 shadow-xl"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-11 items-center justify-center rounded-full border border-destructive/40 text-destructive">
              <AlertTriangle className="size-5" />
            </div>

            <h2 className="text-base font-semibold text-foreground">
              Microphone Detected
            </h2>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>
                The selected device{" "}
                <span className="font-semibold text-foreground">
                  "{deviceName}"
                </span>{" "}
                appears to be a physical microphone.
              </p>
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-left text-destructive">
                <strong>Risk of feedback:</strong> Listening to the amp through
                speakers while using a microphone will cause a loud feedback
                loop.
              </p>
              <p>
                HF-1 is designed for{" "}
                <strong className="text-foreground">virtual audio cables</strong>{" "}
                (BlackHole, VB-Cable, or PipeWire sinks).
              </p>
            </div>

            <div className="mt-2 grid w-full grid-cols-2 gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onContinue}>
                Continue anyway
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
