/**
 * Footer - Premium sticky footer bar with audio status, theme selector, and links
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAudioStore } from "../../store/useAudioStore";
import { useThemeStore } from "../../store/useThemeStore";
import AudioEngine from "../../audio/AudioEngine";

export function Footer(): JSX.Element {
  const isRunning = useAudioStore((state) => state.isRunning);
  const inputDeviceId = useAudioStore((state) => state.inputDeviceId);
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId);
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [bufferSize, setBufferSize] = useState<number | null>(null);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    if (isRunning) {
      // Small delay to allow AudioContext to update after device change
      const timeoutId = setTimeout(() => {
        const engine = AudioEngine.getInstance();
        setSampleRate(engine.getSampleRate());
        setBufferSize(engine.getBufferSizeSamples());
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setSampleRate(null);
      setBufferSize(null);
    }
  }, [isRunning, inputDeviceId, outputDeviceId]);

  const formatSampleRate = (rate: number): string => {
    return rate >= 1000
      ? `${(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)}kHz`
      : `${rate}Hz`;
  };

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 md:px-8"
      style={{
        backgroundColor:
          theme === "vintage"
            ? "rgba(18, 16, 14, 0.95)"
            : "rgba(17, 17, 19, 0.95)",
        borderTop:
          theme === "vintage"
            ? "1px solid #2a2520"
            : "1px solid rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left side: Audio status */}
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor: isRunning ? "#4ADE80" : "#3F3F46",
              boxShadow: isRunning
                ? "0 0 6px rgba(74, 222, 128, 0.6)"
                : "0 0 0 rgba(0, 0, 0, 0)",
            }}
            transition={{ duration: 0.2 }}
          />
          <span className="text-xs text-text-secondary">
            {isRunning ? "Audio Engine Running" : "Audio Engine Stopped"}
          </span>
        </div>

        {/* Sample rate (only show when running and available) */}
        {isRunning && sampleRate && (
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-xs text-text-tertiary">Sample Rate:</span>
            <span className="text-xs font-mono text-text-secondary">
              {formatSampleRate(sampleRate)}
            </span>
          </div>
        )}

        {/* Buffer size (only show when running and available) */}
        {isRunning && bufferSize && (
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-xs text-text-tertiary">Buffer:</span>
            <span className="text-xs font-mono text-text-secondary">
              {bufferSize} samples
            </span>
          </div>
        )}

        {/* Version */}
        <div className="hidden sm:flex items-center">
          <span className="text-xs font-mono text-text-tertiary">v0.10.0</span>
        </div>
      </div>

      {/* Right side: Theme selector and Links */}
      <div className="flex items-center gap-4">
        {/* Theme Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary hidden sm:inline">
            Theme:
          </span>
          <div
            className="flex rounded-md overflow-hidden"
            style={{
              border:
                theme === "vintage"
                  ? "1px solid #2a2520"
                  : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              onClick={() => setTheme("vintage")}
              className={`px-2 py-1 text-xs transition-colors duration-150 ${
                theme === "vintage"
                  ? "bg-accent-primary text-bg-primary"
                  : "bg-bg-secondary text-text-secondary hover:text-text-primary"
              }`}
              style={
                theme === "vintage"
                  ? { boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)" }
                  : {}
              }
            >
              Vintage
            </button>
            <button
              onClick={() => setTheme("modern")}
              className={`px-2 py-1 text-xs transition-colors duration-150 ${
                theme === "modern"
                  ? "bg-accent-primary text-bg-primary"
                  : "bg-bg-secondary text-text-secondary hover:text-text-primary"
              }`}
              style={
                theme === "modern"
                  ? { boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)" }
                  : {}
              }
            >
              Modern
            </button>
          </div>
        </div>

        {/* Separator */}
        <div
          className="hidden sm:block w-px h-4"
          style={{
            backgroundColor:
              theme === "vintage" ? "#2a2520" : "rgba(255, 255, 255, 0.1)",
          }}
        />

        {/* GitHub */}
        <a
          href="https://github.com/YarinCardillo/ember-web-app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-secondary hover:text-text-primary transition-colors duration-150 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="hidden sm:inline">GitHub</span>
        </a>

        {/* Portfolio */}
        <a
          href="https://yarincardillo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-secondary hover:text-text-primary transition-colors duration-150"
        >
          Portfolio
        </a>

        {/* Buy me a coffee */}
        <a
          href="https://buymeacoffee.com/yarincardillo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent-primary hover:text-accent-bright transition-colors duration-150 flex items-center gap-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364z" />
          </svg>
          <span className="hidden sm:inline">Support</span>
        </a>
      </div>
    </motion.footer>
  );
}
