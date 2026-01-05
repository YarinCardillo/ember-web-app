/**
 * SafetyWarningModal - Warns users about potential feedback loops
 */

interface SafetyWarningModalProps {
    deviceName: string;
    onCancel: () => void;
    onContinue: () => void;
}

export function SafetyWarningModal({ deviceName, onCancel, onContinue }: SafetyWarningModalProps): JSX.Element {
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
            <div className="bg-gray-900 border border-red-800 rounded-lg p-8 max-w-md mx-4 shadow-2xl animate-fade-in relative">
                {/* Warning Icon */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 p-2 rounded-full border border-red-800">
                    <div className="text-4xl">⚠️</div>
                </div>

                <div className="text-center mt-4">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Microphone Detected</h2>

                    <div className="space-y-4 text-text-light">
                        <p>
                            The selected device <span className="text-ember-orange font-semibold">"{deviceName}"</span> appears to be a physical microphone.
                        </p>

                        <p className="text-sm bg-red-900/20 border border-red-900/50 p-3 rounded">
                            <strong className="text-red-400">Risk of Feedback:</strong> Listening to the amp through speakers while using a microphone will cause a loud feedback loop.
                        </p>

                        <p className="text-sm text-text-secondary">
                            Ember Amp is designed to be used with <strong>virtual audio cables</strong> (like BlackHole, VB-Cable, or PipeWire sinks).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-text-light font-medium transition-colors border border-gray-700"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onContinue}
                        className="px-4 py-2 rounded bg-red-900 hover:bg-red-800 text-white font-medium transition-colors border border-red-700"
                    >
                        Continue Anyway
                    </button>
                </div>
            </div>
        </div>
    );
}
