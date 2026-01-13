/**
 * useAudioAnalyser - Connects to AnalyserNode, provides RMS/peak values
 *
 * Uses throttled updates (~30fps baseline) with a perceptible change threshold
 * to reduce React re-renders while maintaining responsive meter movement.
 */

import { useState, useEffect, useRef } from "react";

interface AnalyserData {
  rms: number;
  peak: number;
  rmsDb: number;
  peakDb: number;
}

// Update throttling constants
const THROTTLE_MS = 33; // ~30fps baseline
const THRESHOLD_DB = 0.5; // Perceptible change threshold

export function useAudioAnalyser(analyser: AnalyserNode | null): AnalyserData {
  const dataRef = useRef<AnalyserData>({
    rms: 0,
    peak: 0,
    rmsDb: -Infinity,
    peakDb: -Infinity,
  });
  const [, forceUpdate] = useState(0);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!analyser) {
      dataRef.current = {
        rms: 0,
        peak: 0,
        rmsDb: -Infinity,
        peakDb: -Infinity,
      };
      forceUpdate((n) => n + 1);
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const update = (): void => {
      animationFrameRef.current = requestAnimationFrame(update);

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const rmsDb = 20 * Math.log10(rms || 0.0001);

      // Calculate peak
      let max = 0;
      for (let i = 0; i < bufferLength; i++) {
        const abs = Math.abs(dataArray[i]);
        if (abs > max) max = abs;
      }
      const peak = max;
      const peakDb = 20 * Math.log10(peak || 0.0001);

      // Only trigger re-render at ~30fps baseline or on perceptible change
      const now = performance.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      const rmsChange = Math.abs(rmsDb - dataRef.current.rmsDb);

      if (timeSinceLastUpdate > THROTTLE_MS || rmsChange > THRESHOLD_DB) {
        dataRef.current = { rms, peak, rmsDb, peakDb };
        lastUpdateRef.current = now;
        forceUpdate((n) => n + 1);
      }
    };

    update();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser]);

  return dataRef.current;
}
