/**
 * SetupGuide - Modal/overlay explaining virtual audio cable setup
 */

interface SetupGuideProps {
  onClose: () => void;
}

export function SetupGuide({ onClose }: SetupGuideProps): JSX.Element {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-ember-orange">Setup Guide</h2>
          <button
            onClick={onClose}
            className="text-text-light hover:text-ember-orange transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 text-text-light">
          <div className="bg-amber-900/30 border border-amber-700/50 p-4 rounded">
            <p className="text-sm">
              <strong className="text-amber-glow">⚠️ Browser Compatibility:</strong> Ember Amp Web is fully supported only on{' '}
              <strong>Chromium-based browsers</strong> (Chrome, Edge, Brave, Opera).
              Firefox and Safari have limited support (output device selection not available).
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-amber-glow mb-2">
              Virtual Audio Cable Setup
            </h3>
            <p className="mb-4">
              To route your system audio through Ember, you need to install a virtual audio cable.
              This allows your computer's audio output to be captured as an input device.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Signal flow: System Audio → Virtual Cable Input → Virtual Cable Output → Ember Input → Ember Processing → Ember Output → Speakers
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Windows:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Download and install <strong>VB-Cable</strong> from{' '}
                <a
                  href="https://vb-audio.com/Cable/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ember-orange hover:underline"
                >
                  vb-audio.com
                </a>
              </li>
              <li>Set <strong>CABLE Input</strong> as your system output device</li>
              <li>In this app, select <strong>CABLE Output</strong> as your input device</li>
              <li>In this app, select your speakers/headphones as your <strong>output</strong> device</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">macOS:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Download and install <strong>BlackHole</strong> (2ch version) from{' '}
                <a
                  href="https://existential.audio/blackhole/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ember-orange hover:underline"
                >
                  existential.audio
                </a>
              </li>
              <li>Set <strong>BlackHole 2ch</strong> as your system output device</li>
              <li>In this app, select <strong>BlackHole 2ch</strong> as your <strong>input</strong> device</li>
              <li>In this app, select your speakers/headphones as your <strong>output</strong> device</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Linux:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Install <code className="bg-gray-800 px-1 rounded">pulseaudio-module-jack</code> or use JACK</li>
              <li>Configure PulseAudio to route audio through a virtual sink</li>
              <li>Select the virtual sink as your input device in this app</li>
            </ol>
          </div>

          <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
            <p className="text-sm">
              <strong>Note:</strong> After setting up your virtual audio cable, refresh this page
              and <strong>grant microphone permissions</strong> when prompted. The app will then be able to capture
              your system audio.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-ember-orange hover:bg-amber-glow text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

