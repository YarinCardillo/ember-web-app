/**
 * VUMeter - Animated level meter with peak hold and analog ballistics
 */

import { useEffect, useRef, useState } from 'react';
import { linearToDb } from '../../utils/dsp-math';

interface VUMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  range?: { min: number; max: number }; // dB range
}

export function VUMeter({
  analyser,
  label = 'Level',
  range = { min: -60, max: 6 },
}: VUMeterProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [peakHold, setPeakHold] = useState<number>(range.min);
  const peakHoldTimeoutRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    let rmsLevel = 0;
    let peakLevel = range.min;

    const draw = (): void => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      rmsLevel = Math.sqrt(sum / bufferLength);
      const rmsDb = linearToDb(rmsLevel);

      // Calculate peak
      let max = 0;
      for (let i = 0; i < bufferLength; i++) {
        const abs = Math.abs(dataArray[i]);
        if (abs > max) max = abs;
      }
      peakLevel = linearToDb(max);

      // Update peak hold
      if (peakLevel > peakHold) {
        setPeakHold(peakLevel);
        // Clear existing timeout
        if (peakHoldTimeoutRef.current) {
          clearTimeout(peakHoldTimeoutRef.current);
        }
        // Decay after 1 second
        peakHoldTimeoutRef.current = window.setTimeout(() => {
          setPeakHold((prev) => Math.max(prev - 1, range.min));
        }, 1000);
      }

      // Draw meter
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = 20;
      const barX = (width - barWidth) / 2;

      // Background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // Meter segments (green, yellow, red)
      const dbRange = range.max - range.min;
      const normalizedRms = Math.max(0, Math.min(1, (rmsDb - range.min) / dbRange));
      const normalizedPeak = Math.max(0, Math.min(1, (peakLevel - range.min) / dbRange));
      const normalizedHold = Math.max(0, Math.min(1, (peakHold - range.min) / dbRange));

      const rmsHeight = normalizedRms * height;
      const peakHeight = normalizedPeak * height;
      const holdHeight = normalizedHold * height;

      // Green zone (bottom 60%)
      const greenHeight = height * 0.6;
      if (rmsHeight <= greenHeight) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, height - rmsHeight, barWidth, rmsHeight);
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, height - greenHeight, barWidth, greenHeight);
        // Yellow zone (middle 30%)
        const yellowHeight = height * 0.3;
        if (rmsHeight <= greenHeight + yellowHeight) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(barX, height - rmsHeight, barWidth, rmsHeight - greenHeight);
        } else {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(barX, height - (greenHeight + yellowHeight), barWidth, yellowHeight);
          // Red zone (top 10%)
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(barX, height - rmsHeight, barWidth, rmsHeight - (greenHeight + yellowHeight));
        }
      }

      // Peak indicator (thin line)
      if (peakHeight > 0) {
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(barX, height - peakHeight - 1, barWidth, 2);
      }

      // Peak hold indicator (dotted line)
      if (holdHeight > 0) {
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(barX - 5, height - holdHeight);
        ctx.lineTo(barX + barWidth + 5, height - holdHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Border
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, 0, barWidth, height);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (peakHoldTimeoutRef.current) {
        clearTimeout(peakHoldTimeoutRef.current);
      }
    };
  }, [analyser, range, peakHold]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-text-light opacity-80">{label}</div>
      <div className="vu-glow bg-dark-bg border border-gray-700 rounded p-2">
        <canvas
          ref={canvasRef}
          width={40}
          height={200}
          className="block"
        />
      </div>
      <div className="text-xs font-mono text-amber-glow">
        {peakHold > range.min ? `${peakHold.toFixed(1)} dB` : '---'}
      </div>
    </div>
  );
}

