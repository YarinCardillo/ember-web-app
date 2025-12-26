/**
 * useAudioAnalyser - Connects to AnalyserNode, provides RMS/peak values at 60fps
 */

import { useState, useEffect, useRef } from 'react';

interface AnalyserData {
  rms: number;
  peak: number;
  rmsDb: number;
  peakDb: number;
}

export function useAudioAnalyser(analyser: AnalyserNode | null): AnalyserData {
  const [data, setData] = useState<AnalyserData>({
    rms: 0,
    peak: 0,
    rmsDb: -Infinity,
    peakDb: -Infinity,
  });
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!analyser) {
      setData({
        rms: 0,
        peak: 0,
        rmsDb: -Infinity,
        peakDb: -Infinity,
      });
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

      setData({ rms, peak, rmsDb, peakDb });
    };

    update();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser]);

  return data;
}

