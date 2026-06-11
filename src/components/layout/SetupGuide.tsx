/**
 * SetupGuide - Modal/overlay explaining virtual audio cable setup (TE style).
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, X } from "lucide-react";
import { Button } from "../ui/shadcn/button";

interface SetupGuideProps {
  onClose: () => void;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * CodeBlock - Command box with a copy-to-clipboard button.
 */
function CodeBlock({ code, language = "bash" }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-border bg-secondary p-3 pr-12 font-mono text-[13px] leading-relaxed text-foreground">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCopy}
        className="absolute right-1.5 top-1.5 size-7 bg-card text-muted-foreground hover:text-foreground"
        aria-label={copied ? "Copied" : "Copy command"}
        title={copied ? "Copied" : "Copy command"}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

export function SetupGuide({ onClose }: SetupGuideProps): JSX.Element {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-foreground/20"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.96, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 16, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Setup Guide
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                virtual audio cable
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X />
            </Button>
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="flex flex-col gap-6 text-sm text-foreground">
              <div className="rounded-md border border-brand/30 bg-brand/10 p-4">
                <p>
                  <strong className="text-brand">Browser compatibility:</strong>{" "}
                  Ember Amp is fully supported only on{" "}
                  <strong>Chromium-based browsers</strong> (Chrome, Edge, Brave,
                  Opera). Firefox and Safari have limited support (output device
                  selection not available).
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  Virtual Audio Cable Setup
                </h3>
                <p className="mb-3">
                  To route your system audio through Ember, install a virtual
                  audio cable. This lets your computer's audio output be captured
                  as an input device.
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  System Audio → Virtual Cable → Ember Input → Processing →
                  Ember Output → Speakers
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">Windows</h4>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted-foreground">
                  <li>
                    Download and install <strong>VB-Cable</strong> from{" "}
                    <a
                      href="https://vb-audio.com/Cable/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
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
                    Select your speakers/headphones as your{" "}
                    <strong>output</strong> device
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">macOS</h4>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted-foreground">
                  <li>
                    Download and install <strong>BlackHole</strong> (2ch
                    version) from{" "}
                    <a
                      href="https://existential.audio/blackhole/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
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
                    Select your speakers/headphones as your{" "}
                    <strong>output</strong> device
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="mb-3 font-semibold">
                  Linux: PipeWire (Arch, Fedora, Ubuntu 22.10+)
                </h4>
                <ol className="flex list-decimal flex-col gap-3 pl-5 marker:text-muted-foreground">
                  <li className="space-y-2 pl-1">
                    Create a virtual sink (temporary, lives until reboot):
                    <CodeBlock code='pactl load-module module-null-sink sink_name=ember_virtual sink_properties=device.description="Ember_Virtual"' />
                  </li>
                  <li className="pl-1">
                    Set as system output:{" "}
                    <strong>Settings → Sound → Output → Ember_Virtual</strong>
                  </li>
                  <li className="space-y-1 pl-1">
                    In Ember app:
                    <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm marker:text-muted-foreground">
                      <li>
                        Input: select <strong>"Ember_Virtual"</strong>
                      </li>
                      <li>Output: select your speakers/headphones</li>
                    </ul>
                  </li>
                </ol>

                <div className="mt-4 rounded-md border border-border bg-secondary p-4">
                  <h5 className="mb-3 font-semibold">
                    Make it persistent (optional)
                  </h5>
                  <p className="mb-2 text-sm">
                    Create{" "}
                    <code className="break-all rounded bg-muted px-1 font-mono text-xs">
                      ~/.config/pipewire/pipewire.conf.d/ember-virtual.conf
                    </code>
                    :
                  </p>
                  <CodeBlock
                    code={`context.exec = [
    { path = "pactl" args = "load-module module-null-sink sink_name=ember_virtual sink_properties=device.description=Ember_Virtual" }
]`}
                  />
                  <p className="mb-2 mt-3 text-sm">Then restart PipeWire:</p>
                  <CodeBlock code="systemctl --user restart pipewire" />
                </div>
              </div>

              <div className="rounded-md border border-border bg-secondary p-4">
                <p className="text-sm">
                  <strong>Note:</strong> After setting up your virtual audio
                  cable, refresh this page and{" "}
                  <strong>grant microphone permissions</strong> when prompted.
                </p>
              </div>

              <Button className="w-full" onClick={onClose}>
                Got it
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
