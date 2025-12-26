/**
 * Credits - Project information, credits, and links
 */

export function Credits(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800 h-full">
      <h3 className="text-lg font-semibold text-ember-orange">ABOUT</h3>
      
      <div className="flex flex-col gap-3 text-sm text-text-light">
        <div>
          <p className="opacity-80 leading-relaxed">
            EMBER AMP is a browser-based HiFi amplifier simulator with real-time DSP processing.
            All audio processing happens locally in your browser using the Web Audio API. Open source on GitHub.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <h4 className="text-xs font-semibold text-ember-orange mb-2">TECH STACK</h4>
          <p className="text-xs opacity-70">
            React + TypeScript • Web Audio API • AudioWorklet • Zustand • Tailwind CSS
          </p>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <h4 className="text-xs font-semibold text-ember-orange mb-2">FEATURES</h4>
          <ul className="text-xs opacity-70 space-y-1">
            <li>• Zero-latency audio processing</li>
            <li>• Analog-modeled tube saturation</li>
            <li>• 4-band fixedparametric EQ</li>
            <li>• Hard clipper output circuit</li>
            <li>• Some cool presets</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-gray-800 mt-auto">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="opacity-50">Vibecoded with 🧡 by Yarin Cardillo</span>
            <div className="flex items-center gap-3">
              <a 
                href="https://yarincardillo.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-ember-orange hover:text-amber-glow transition-colors"
              >
                Portfolio →
              </a>
              <a 
                href="https://github.com/YarinCardillo/ember-web-app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-ember-orange hover:text-amber-glow transition-colors"
              >
                GitHub →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

