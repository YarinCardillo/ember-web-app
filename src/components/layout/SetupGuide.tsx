/**
 * SetupGuide - Modal/overlay explaining virtual audio cable setup
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SetupGuideProps {
  onClose: () => void;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * CodeBlock - Displays code with a copy-to-clipboard button
 */
function CodeBlock({ code, language = "bash" }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="relative group">
      <pre className="bg-bg-tertiary border border-white/6 rounded p-3 overflow-x-auto text-sm font-mono">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-bg-secondary hover:bg-bg-hover rounded text-xs text-text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={copied ? "Copied!" : "Copy to clipboard"}
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? "✓" : "⧉"}
      </button>
    </div>
  );
}

export function SetupGuide({ onClose }: SetupGuideProps): JSX.Element {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="premium-card p-8 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent-primary">
              Setup Guide
            </h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-accent-primary transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6 text-text-primary">
            <div className="bg-accent-primary/10 border border-accent-primary/30 p-4 rounded">
              <p className="text-sm">
                <strong className="text-accent-bright">
                  ⚠️ Browser Compatibility:
                </strong>{" "}
                Ember Amp Web is fully supported only on{" "}
                <strong>Chromium-based browsers</strong> (Chrome, Edge, Brave,
                Opera). Firefox and Safari have limited support (output device
                selection not available).
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-accent-bright mb-2">
                Virtual Audio Cable Setup
              </h3>
              <p className="mb-4">
                To route your system audio through Ember, you need to install a
                virtual audio cable. This allows your computer's audio output to
                be captured as an input device.
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Signal flow: System Audio → Virtual Cable Input → Virtual Cable
                Output → Ember Input → Ember Processing → Ember Output →
                Speakers
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Windows:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>
                  Download and install <strong>VB-Cable</strong> from{" "}
                  <a
                    href="https://vb-audio.com/Cable/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:underline"
                  >
                    vb-audio.com
                  </a>
                </li>
                <li>
                  Set <strong>CABLE Input</strong> as your system output device
                </li>
                <li>
                  In this app, select <strong>CABLE Output</strong> as your
                  input device
                </li>
                <li>
                  In this app, select your speakers/headphones as your{" "}
                  <strong>output</strong> device
                </li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">macOS:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>
                  Download and install <strong>BlackHole</strong> (2ch version)
                  from{" "}
                  <a
                    href="https://existential.audio/blackhole/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-primary hover:underline"
                  >
                    existential.audio
                  </a>
                </li>
                <li>
                  Set <strong>BlackHole 2ch</strong> as your system output
                  device
                </li>
                <li>
                  In this app, select <strong>BlackHole 2ch</strong> as your{" "}
                  <strong>input</strong> device
                </li>
                <li>
                  In this app, select your speakers/headphones as your{" "}
                  <strong>output</strong> device
                </li>
              </ol>
            </div>

            {/* Linux PipeWire Section */}
            <div>
              <h4 className="font-semibold mb-2">
                Linux: PipeWire (Arch, Fedora, Ubuntu 22.10+)
              </h4>

              <ol className="list-decimal list-inside space-y-4 ml-4">
                <li className="space-y-2">
                  <span>
                    Create a virtual sink (temporary, lives until reboot):
                  </span>
                  <div className="ml-4">
                    <CodeBlock code='pactl load-module module-null-sink sink_name=ember_virtual sink_properties=device.description="Ember_Virtual"' />
                  </div>
                </li>

                <li>
                  Set as system output:{" "}
                  <strong>Settings → Sound → Output → Ember_Virtual</strong>
                </li>

                <li className="space-y-1">
                  <span>In Ember app:</span>
                  <ul className="list-disc list-inside ml-4 text-sm">
                    <li>
                      Input: select <strong>"Ember_Virtual"</strong>
                    </li>
                    <li>Output: select your speakers/headphones</li>
                  </ul>
                </li>
              </ol>

              {/* Optional: Make permanent */}
              <div className="mt-4 ml-4 bg-bg-tertiary/50 border border-white/6 rounded p-4">
                <h5 className="font-semibold text-accent-bright mb-3">
                  Make it persistent (optional)
                </h5>

                <p className="text-sm mb-2">
                  Create{" "}
                  <code className="bg-bg-tertiary px-1 rounded font-mono">
                    ~/.config/pipewire/pipewire.conf.d/ember-virtual.conf
                  </code>
                  :
                </p>
                <CodeBlock
                  code={`context.exec = [
    { path = "pactl" args = "load-module module-null-sink sink_name=ember_virtual sink_properties=device.description=Ember_Virtual" }
]`}
                />

                <p className="text-sm mt-3 mb-2">Then restart PipeWire:</p>
                <CodeBlock code="systemctl --user restart pipewire" />
              </div>
            </div>

            <div className="bg-bg-tertiary/50 p-4 rounded border border-white/6">
              <p className="text-sm">
                <strong>Note:</strong> After setting up your virtual audio
                cable, refresh this page and{" "}
                <strong>grant microphone permissions</strong> when prompted. The
                app will then be able to capture your system audio.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-accent-primary hover:bg-accent-bright font-semibold py-2 px-4 rounded transition-colors"
              style={{ color: "#e8dccc" }}
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
