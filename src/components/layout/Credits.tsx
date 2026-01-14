/**
 * Credits - Premium project information, credits, and links
 */

import { Ventilation } from "../ui/Ventilation";
import { useThemeStore } from "../../store/useThemeStore";

export function Credits(): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";

  return (
    <div className="premium-card grain-texture flex flex-col gap-4 p-4 h-full">
      {/* Vintage: Embossed logo and ventilation */}
      {isVintage && (
        <div className="text-center py-4">
          <div className="logo-embossed">EMBER</div>
          <div className="tagline">ANALOG WARMTH SIMULATION</div>
          <Ventilation slots={12} className="mt-6" />
        </div>
      )}

      <div className="flex flex-col gap-3 text-sm text-text-primary">
        <div>
          <p className="leading-relaxed">
            EMBER AMP is a browser-based HiFi amplifier simulator with real-time
            DSP processing. All audio processing happens locally in your browser
            using the Web Audio API. Open source on GitHub. Supported for
            Chromium-based desktop browsers only.
          </p>
        </div>

        <div className="pt-2">
          <p className="text-text-secondary italic">
            To my audiophile friend Luigi.
          </p>
        </div>

        <div className="pt-2 border-t border-white/10">
          <h4 className="text-sm font-semibold text-accent-primary mb-2">
            TECH STACK
          </h4>
          <p className="text-sm text-text-secondary">
            React + TypeScript + Web Audio API + AudioWorklet + Zustand +
            Tailwind CSS
          </p>
        </div>

        <div className="pt-2 border-t border-white/10">
          <h4 className="text-sm font-semibold text-accent-primary mb-2">
            FEATURES
          </h4>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>Zero-latency audio processing</li>
            <li>Analog-modeled tube saturation</li>
            <li>4-band parametric EQ</li>
            <li>Hard clipper output circuit</li>
            <li>Some cool presets</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-white/10 mt-auto">
          <span className="text-sm text-text-secondary">
            Made with care by Yarin Cardillo
          </span>
        </div>
      </div>
    </div>
  );
}
