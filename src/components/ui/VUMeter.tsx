/**
 * VUMeter - Premium analog needle-style VU meter with arc scale
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface VUMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  range?: { min: number; max: number };
}

const METER_WIDTH = 200;
const METER_HEIGHT = 110;
const PEAK_BAR_WIDTH = 3;
const PEAK_BAR_MARGIN = 4;

// Premium color palette
const COLORS = {
  bgStart: "#0A0A0B",
  bgEnd: "#111113",
  meterGreen: "#4ADE80",
  meterYellow: "#FACC15",
  meterRed: "#F87171",
  accentPrimary: "#F59E0B",
  accentBright: "#FBBF24",
  tickColor: "#52525B",
  labelColor: "#A1A1AA",
  bezelColor: "rgba(255, 255, 255, 0.06)",
};

export function VUMeter({
  analyser,
  label = "Level",
  range = { min: -60, max: 6 },
}: VUMeterProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const currentNeedleAngleRef = useRef<number>(-135 * (Math.PI / 180));
  const lastUpdateTimeRef = useRef<number>(Date.now());

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

    const scaleMarks = [-60, -48, -36, -24, -12, -6, 0, 6];

    // Draw meter face background (gradient)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, COLORS.bgStart);
    bgGradient.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw color zones on arc
    const zoneAngles = [
      { start: -60, end: -12, color: COLORS.meterGreen },
      { start: -12, end: 0, color: COLORS.meterYellow },
      { start: 0, end: 6, color: COLORS.meterRed },
    ];

    zoneAngles.forEach((zone) => {
      const startNorm = Math.max(
        0,
        Math.min(1, (zone.start - range.min) / dbRange),
      );
      const endNorm = Math.max(
        0,
        Math.min(1, (zone.end - range.min) / dbRange),
      );
      const zoneStartAngle = startAngle + startNorm * angleRange;
      const zoneEndAngle = startAngle + endNorm * angleRange;

      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, zoneStartAngle, zoneEndAngle);
      ctx.stroke();
    });

    // Draw scale arc (main arc line)
    ctx.strokeStyle = COLORS.tickColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    // Draw tick marks and labels
    ctx.strokeStyle = COLORS.tickColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = COLORS.labelColor;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    scaleMarks.forEach((db) => {
      const normalized = Math.max(0, Math.min(1, (db - range.min) / dbRange));
      const angle = startAngle + normalized * angleRange;
      const isMajor =
        db === 0 ||
        db === -12 ||
        db === -24 ||
        db === -36 ||
        db === -48 ||
        db === -60 ||
        db === 6;
      const tickLength = isMajor ? 10 : 5;

      const x1 = centerX + Math.cos(angle) * (radius - tickLength);
      const y1 = centerY + Math.sin(angle) * (radius - tickLength);
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isMajor) {
        const labelX = centerX + Math.cos(angle) * (radius - 22);
        const labelY = centerY + Math.sin(angle) * (radius - 22);
        ctx.fillText(db.toString(), labelX, labelY);
      }
    });

    // Draw bezel border
    ctx.strokeStyle = COLORS.bezelColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const attackTime = 10;
    const releaseTime = 300;

    if (!analyser) {
      drawStaticElements(ctx);

      const needleAngle = startAngle;

      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX + 1, centerY + 1);
      ctx.lineTo(
        centerX + 1 + Math.cos(needleAngle) * (radius - 8),
        centerY + 1 + Math.sin(needleAngle) * (radius - 8),
      );
      ctx.stroke();

      ctx.strokeStyle = COLORS.accentPrimary;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 8),
        centerY + Math.sin(needleAngle) * (radius - 8),
      );
      ctx.stroke();

      ctx.fillStyle = "#27272A";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3F3F46";
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

      let sum = 0;
      let peak = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
        const abs = Math.abs(dataArray[i]);
        if (abs > peak) peak = abs;
      }
      const rmsLevel = Math.sqrt(sum / bufferLength);
      const rmsDb = linearToDb(rmsLevel);
      const peakDb = linearToDb(peak);

      const normalizedRms = Math.max(
        0,
        Math.min(1, (rmsDb - range.min) / dbRange),
      );
      const targetNeedleAngle = startAngle + normalizedRms * angleRange;

      const currentAngle = currentNeedleAngleRef.current;
      const angleDiff = targetNeedleAngle - currentAngle;

      const timeConstant = angleDiff > 0 ? attackTime : releaseTime;
      const smoothingFactor = 1 - Math.exp(-deltaTime / timeConstant);
      currentNeedleAngleRef.current =
        currentAngle + angleDiff * smoothingFactor;

      ctx.clearRect(0, 0, width, height);
      drawStaticElements(ctx);

      const needleAngle = currentNeedleAngleRef.current;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(centerX + 1, centerY + 1);
      ctx.lineTo(
        centerX + 1 + Math.cos(needleAngle) * (radius - 8),
        centerY + 1 + Math.sin(needleAngle) * (radius - 8),
      );
      ctx.stroke();

      const needleGradient = ctx.createLinearGradient(
        centerX,
        centerY,
        centerX + Math.cos(needleAngle) * radius,
        centerY + Math.sin(needleAngle) * radius,
      );
      needleGradient.addColorStop(0, COLORS.accentPrimary);
      needleGradient.addColorStop(0.7, COLORS.accentBright);
      needleGradient.addColorStop(1, COLORS.accentBright);

      ctx.strokeStyle = needleGradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.shadowColor = COLORS.accentBright;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(needleAngle) * (radius - 8),
        centerY + Math.sin(needleAngle) * (radius - 8),
      );
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#27272A";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3F3F46";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();

      const peakBarX = width - PEAK_BAR_MARGIN - PEAK_BAR_WIDTH;
      const peakBarHeight = height - 8;
      const peakBarY = 4;

      ctx.fillStyle = COLORS.bgEnd;
      ctx.fillRect(peakBarX, peakBarY, PEAK_BAR_WIDTH, peakBarHeight);

      const normalizedPeak = Math.max(
        0,
        Math.min(1, (peakDb - range.min) / dbRange),
      );
      const fillHeight = normalizedPeak * peakBarHeight;

      let peakColor = COLORS.meterGreen;
      if (peakDb > 0) {
        peakColor = COLORS.meterRed;
      } else if (peakDb > -12) {
        peakColor = COLORS.meterYellow;
      }

      ctx.fillStyle = peakColor;
      ctx.fillRect(
        peakBarX,
        peakBarY + peakBarHeight - fillHeight,
        PEAK_BAR_WIDTH,
        fillHeight,
      );
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, range]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-text-secondary">{label}</div>
      <div
        className="vu-glow rounded-lg p-2"
        style={{
          backgroundColor: COLORS.bgEnd,
          border: `1px solid ${COLORS.bezelColor}`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={METER_WIDTH}
          height={METER_HEIGHT}
          style={{ width: METER_WIDTH, height: METER_HEIGHT }}
          className="block rounded"
        />
      </div>
    </div>
  );
}
