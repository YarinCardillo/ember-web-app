/**
 * VUMeter - Analog needle-style VU meter with arc scale
 */

import { useEffect, useRef, useState } from 'react';
import { linearToDb } from '../../utils/dsp-math';

interface VUMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  range?: { min: number; max: number }; // dB range
}

// Fixed dimensions for consistent sizing
const METER_WIDTH = 200;
const METER_HEIGHT = 110;

export function VUMeter({
  analyser,
  label = 'Level',
  range = { min: -60, max: 6 },
}: VUMeterProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [peakHold, setPeakHold] = useState<number>(range.min);
  const peakHoldTimeoutRef = useRef<number>();
  
  // Smooth needle position for analog feel
  const currentNeedleAngleRef = useRef<number>(-135 * (Math.PI / 180));
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Draw static elements (runs once or when canvas mounts)
  const drawStaticElements = (ctx: CanvasRenderingContext2D): void => {
    const width = METER_WIDTH;
    const height = METER_HEIGHT;
    const centerX = width / 2;
    const centerY = height - 8;
    const radius = 85;
    const startAngle = -135 * (Math.PI / 180);
    const endAngle = -45 * (Math.PI / 180);
    const angleRange = endAngle - startAngle;
    const dbRange = range.max - range.min;

    // Scale markings (dB values)
    const scaleMarks = [-60, -48, -36, -24, -12, -6, 0, 6];

    // Draw meter face background (gradient)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0f0f0f');
    bgGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw color zones on arc
    const zoneAngles = [
      { start: -60, end: -12, color: '#22c55e' }, // Green
      { start: -12, end: 0, color: '#eab308' }, // Yellow
      { start: 0, end: 6, color: '#ef4444' }, // Red
    ];

    zoneAngles.forEach((zone) => {
      const startNorm = Math.max(0, Math.min(1, (zone.start - range.min) / dbRange));
      const endNorm = Math.max(0, Math.min(1, (zone.end - range.min) / dbRange));
      const zoneStartAngle = startAngle + startNorm * angleRange;
      const zoneEndAngle = startAngle + endNorm * angleRange;

      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, zoneStartAngle, zoneEndAngle);
      ctx.stroke();
    });

    // Draw scale arc (main arc line)
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    // Draw tick marks and labels
    ctx.strokeStyle = '#6a6a6a';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    scaleMarks.forEach((db) => {
      const normalized = Math.max(0, Math.min(1, (db - range.min) / dbRange));
      const angle = startAngle + normalized * angleRange;
      const isMajor = db === 0 || db === -12 || db === -24 || db === -36 || db === -48 || db === -60 || db === 6;
      const tickLength = isMajor ? 10 : 5;
      
      const x1 = centerX + Math.cos(angle) * (radius - tickLength);
      const y1 = centerY + Math.sin(angle) * (radius - tickLength);
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw label for major marks only
      if (isMajor) {
        const labelX = centerX + Math.cos(angle) * (radius - 22);
        const labelY = centerY + Math.sin(angle) * (radius - 22);
        ctx.fillText(db.toString(), labelX, labelY);
      }
    });

    // Draw bezel border
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  };

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = METER_WIDTH * dpr;
    canvas.height = METER_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const width = METER_WIDTH;
    const height = METER_HEIGHT;
    const centerX = width / 2;
    const centerY = height - 8;
    const radius = 85;
    const startAngle = -135 * (Math.PI / 180);
    const endAngle = -45 * (Math.PI / 180);
    const angleRange = endAngle - startAngle;
    const dbRange = range.max - range.min;

    // Smoothing constants (analog ballistics)
    const attackTime = 10; // ms
    const releaseTime = 300; // ms

    // If no analyser, just draw static elements
    if (!analyser) {
      drawStaticElements(ctx);
      
      // Draw needle at min position
      const needleAngle = startAngle;
      
      // Draw needle shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX + 1, centerY + 1);
      ctx.lineTo(
        centerX + 1 + Math.cos(needleAngle) * (radius - 8),
        centerY + 1 + Math.sin(needleAngle) * (radius - 8)
      );
      ctx.stroke();

      // Draw needle
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 8),
        centerY + Math.sin(needleAngle) * (radius - 8)
      );
      ctx.stroke();

      // Draw pivot point
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#6a6a6a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();
      
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const draw = (): void => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rmsLevel = Math.sqrt(sum / bufferLength);
      const rmsDb = linearToDb(rmsLevel);

      // Update peak hold based on RMS (tracks where needle actually reaches)
      if (rmsDb > peakHold) {
        setPeakHold(rmsDb);
        if (peakHoldTimeoutRef.current) {
          clearTimeout(peakHoldTimeoutRef.current);
        }
        peakHoldTimeoutRef.current = window.setTimeout(() => {
          setPeakHold((prev) => Math.max(prev - 1, range.min));
        }, 1000);
      }

      // Calculate target needle angle
      const normalizedRms = Math.max(0, Math.min(1, (rmsDb - range.min) / dbRange));
      const targetNeedleAngle = startAngle + normalizedRms * angleRange;

      // Smooth needle movement (analog ballistics)
      const currentAngle = currentNeedleAngleRef.current;
      const angleDiff = targetNeedleAngle - currentAngle;
      
      const timeConstant = angleDiff > 0 ? attackTime : releaseTime;
      const smoothingFactor = 1 - Math.exp(-deltaTime / timeConstant);
      currentNeedleAngleRef.current = currentAngle + angleDiff * smoothingFactor;

      // Redraw everything
      ctx.clearRect(0, 0, width, height);
      drawStaticElements(ctx);

      // Draw peak hold indicator (small dot) - aligned with needle tip
      const peakHoldNorm = Math.max(0, Math.min(1, (peakHold - range.min) / dbRange));
      const peakHoldAngle = startAngle + peakHoldNorm * angleRange;
      const peakHoldX = centerX + Math.cos(peakHoldAngle) * (radius);
      const peakHoldY = centerY + Math.sin(peakHoldAngle) * (radius);
      
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.arc(peakHoldX, peakHoldY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw needle shadow
      const needleAngle = currentNeedleAngleRef.current;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX + 1, centerY + 1);
      ctx.lineTo(
        centerX + 1 + Math.cos(needleAngle) * (radius - 8),
        centerY + 1 + Math.sin(needleAngle) * (radius - 8)
      );
      ctx.stroke();

      // Draw needle with glow
      const needleGradient = ctx.createLinearGradient(
        centerX,
        centerY,
        centerX + Math.cos(needleAngle) * radius,
        centerY + Math.sin(needleAngle) * radius
      );
      needleGradient.addColorStop(0, '#ff6b35');
      needleGradient.addColorStop(0.7, '#ffaa00');
      needleGradient.addColorStop(1, '#ffaa00');

      ctx.strokeStyle = needleGradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 8),
        centerY + Math.sin(needleAngle) * (radius - 8)
      );
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw pivot point
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#6a6a6a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();
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

  // Reset peak hold on click (hidden feature)
  const handleResetPeak = (): void => {
    setPeakHold(range.min);
    if (peakHoldTimeoutRef.current) {
      clearTimeout(peakHoldTimeoutRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-text-light opacity-80">{label}</div>
      <div 
        className="vu-glow bg-dark-bg border border-gray-700 rounded p-2"
        onClick={handleResetPeak}
      >
        <canvas
          ref={canvasRef}
          width={METER_WIDTH}
          height={METER_HEIGHT}
          style={{ width: METER_WIDTH, height: METER_HEIGHT }}
          className="block"
        />
      </div>
      <div className="text-xs font-mono text-amber-glow min-w-[70px] text-center">
        {peakHold > range.min ? `${peakHold.toFixed(1)} dB` : '---'}
      </div>
    </div>
  );
}
