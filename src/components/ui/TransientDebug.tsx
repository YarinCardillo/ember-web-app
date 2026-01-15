/**
 * TransientDebug - Debug UI for transient shaper parameter tuning
 * This component is temporary for parameter tuning.
 */

import { useState } from "react";
import { useAudioStore } from "../../store/useAudioStore";

export function TransientDebug(): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const attack = useAudioStore((state) => state.transientAttack);
  const sustain = useAudioStore((state) => state.transientSustain);
  const mix = useAudioStore((state) => state.transientMix);
  const bypass = useAudioStore((state) => state.bypassTransient);

  const setAttack = (value: number) =>
    useAudioStore.getState().setParameter("transientAttack", value);
  const setSustain = (value: number) =>
    useAudioStore.getState().setParameter("transientSustain", value);
  const setMix = (value: number) =>
    useAudioStore.getState().setParameter("transientMix", value);
  const setBypass = (value: boolean) =>
    useAudioStore.getState().setParameter("bypassTransient", value);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-lg min-w-[280px]">
      {/* Header - clickable to collapse */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-3 py-2 text-left text-sm font-semibold text-amber-glow bg-gray-800 hover:bg-gray-750 transition-colors flex items-center justify-between rounded-t-lg"
      >
        <span>Transient Shaper (Debug)</span>
        <span className="text-xs">{isCollapsed ? "▼" : "▲"}</span>
      </button>

      {!isCollapsed && (
        <div className="p-3 space-y-3">
          {/* Bypass Toggle */}
          <button
            type="button"
            onClick={() => setBypass(!bypass)}
            className={`w-full px-3 py-2 text-sm font-medium rounded transition-colors ${
              bypass
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-green-700 hover:bg-green-600 text-white"
            }`}
          >
            {bypass ? "BYPASSED" : "ACTIVE"}
          </button>

          {/* Attack Control */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="text-text-light">Attack</label>
              <span className="text-amber-glow font-mono">
                {Math.round(attack * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={attack}
              onChange={(e) => setAttack(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-glow"
            />
          </div>

          {/* Sustain Control */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="text-text-light">Sustain</label>
              <span className="text-amber-glow font-mono">
                {Math.round(sustain * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={sustain}
              onChange={(e) => setSustain(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-glow"
            />
          </div>

          {/* Mix Control */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="text-text-light">Mix</label>
              <span className="text-amber-glow font-mono">
                {Math.round(mix * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mix}
              onChange={(e) => setMix(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-glow"
            />
          </div>
        </div>
      )}
    </div>
  );
}
