/**
 * SafetyWarningModal - Premium warning modal for potential feedback loops
 */

import { motion, AnimatePresence } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="premium-card p-8 max-w-md mx-4 shadow-2xl relative"
          style={{
            border: "1px solid rgba(248, 113, 113, 0.3)",
          }}
        >
          {/* Warning Icon */}
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-bg-secondary p-3 rounded-full"
            style={{ border: "1px solid rgba(248, 113, 113, 0.3)" }}
          >
            <div className="text-3xl">Warning</div>
          </div>

          <div className="text-center mt-4">
            <h2 className="text-2xl font-bold text-meter-red mb-4">
              Microphone Detected
            </h2>

            <div className="space-y-4 text-text-secondary">
              <p>
                The selected device{" "}
                <span className="text-accent-primary font-semibold">
                  "{deviceName}"
                </span>{" "}
                appears to be a physical microphone.
              </p>

              <p className="text-sm bg-meter-red/10 border border-meter-red/20 p-3 rounded-lg">
                <strong className="text-meter-red">Risk of Feedback:</strong>{" "}
                Listening to the amp through speakers while using a microphone
                will cause a loud feedback loop.
              </p>

              <p className="text-sm text-text-tertiary">
                Ember Amp is designed to be used with{" "}
                <strong className="text-text-secondary">
                  virtual audio cables
                </strong>{" "}
                (like BlackHole, VB-Cable, or PipeWire sinks).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <motion.button
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-primary font-medium transition-colors"
              style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={onContinue}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 rounded-lg bg-meter-red/20 hover:bg-meter-red/30 text-meter-red font-medium transition-colors"
              style={{ border: "1px solid rgba(248, 113, 113, 0.3)" }}
            >
              Continue Anyway
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
