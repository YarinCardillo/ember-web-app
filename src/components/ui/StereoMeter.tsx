/**
 * StereoMeter - Premium horizontal stereo bar meter with canvas rendering
 * Used for clipper metering with left/right channel display
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface StereoMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  mode?: "rms" | "peak";
  width?: number;
  variant?: "modern" | "vintage";
}

const MIN_DB = -60;
const MAX_DB = 6;
const DB_RANGE = MAX_DB - MIN_DB;

// Color thresholds in dB
const YELLOW_THRESHOLD = -12;
const RED_THRESHOLD = 0;

// Smoothing ballistics (ms)
const ATTACK_TIME = 15;
const RELEASE_TIME = 150;

// Colors
const COLORS_MODERN = {
  green: "#4ADE80",
  yellow: "#FACC15",
  red: "#F87171",
  background: "#111111",
  barBackground: "#1a1a1a",
  labelColor: "#666666",
  scaleColor: "#444444",
};

const COLORS_VINTAGE = {
  green: "#F5A524",
  yellow: "#fbbf24",
  red: "#ef4444",
  background: "linear-gradient(180deg, #e8dcc8 0%, #d4c4a8 100%)",
  barBackground: "#1a1815",
  labelColor: "#3d2e1a",
  scaleColor: "#5c4a2a",
};

export function StereoMeter({
  analyser,
  label = "Clipper",
  mode = "peak",
  width = 280,
  variant = "modern",
}: StereoMeterProps): JSX.Element {
  const COLORS = variant === "vintage" ? COLORS_VINTAGE : COLORS_MODERN;
  const isVintage = variant === "vintage";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const smoothedLevelL = useRef(MIN_DB);
  const smoothedLevelR = useRef(MIN_DB);
  const lastUpdateTime = useRef(Date.now());

  const scale = width / 280;
  const height = 58 * scale;
  const barHeight = 14 * scale;
  const barMarginLeft = 20 * scale;
  const barMarginRight = 8 * scale;
  const barWidth = width - barMarginLeft - barMarginRight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const dbToX = (db: number): number => {
      const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
      const normalized = (clamped - MIN_DB) / DB_RANGE;
      return barMarginLeft + normalized * barWidth;
    };

    const getBarGradient = (ctx: CanvasRenderingContext2D): CanvasGradient => {
      const gradient = ctx.createLinearGradient(
        barMarginLeft,
        0,
        barMarginLeft + barWidth,
        0,
      );

      const yellowPos = (YELLOW_THRESHOLD - MIN_DB) / DB_RANGE;
      const redPos = (RED_THRESHOLD - MIN_DB) / DB_RANGE;

      gradient.addColorStop(0, COLORS.green);
      gradient.addColorStop(yellowPos * 0.95, COLORS.green);
      gradient.addColorStop(yellowPos, COLORS.yellow);
      gradient.addColorStop(redPos * 0.98, COLORS.yellow);
      gradient.addColorStop(redPos, COLORS.red);
      gradient.addColorStop(1, COLORS.red);

      return gradient;
    };

    const getDbColor = (db: number): string => {
      if (db >= RED_THRESHOLD) return COLORS.red;
      if (db >= YELLOW_THRESHOLD) return COLORS.yellow;
      return COLORS.green;
    };

    const smoothLevel = (
      current: number,
      target: number,
      deltaTime: number,
    ): number => {
      const timeConstant = target > current ? ATTACK_TIME : RELEASE_TIME;
      const factor = 1 - Math.exp(-deltaTime / timeConstant);
      return current + (target - current) * factor;
    };

    const drawChannel = (
      channelLabel: string,
      levelDb: number,
      yOffset: number,
    ): void => {
      const barY = yOffset;

      // Channel label
      ctx.fillStyle = COLORS.labelColor;
      ctx.font = `${11 * scale}px system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(channelLabel, 4 * scale, barY + barHeight / 2);

      // Bar background
      ctx.fillStyle = COLORS.barBackground;
      ctx.beginPath();
      ctx.roundRect(barMarginLeft, barY, barWidth, barHeight, barHeight / 2);
      ctx.fill();

      // Active bar
      const levelX = dbToX(levelDb);
      const activeWidth = levelX - barMarginLeft;

      if (activeWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(barMarginLeft, barY, barWidth, barHeight, barHeight / 2);
        ctx.clip();

        ctx.fillStyle = getBarGradient(ctx);
        ctx.fillRect(barMarginLeft, barY, activeWidth, barHeight);

        // Glow effect
        ctx.shadowColor = getDbColor(levelDb);
        ctx.shadowBlur = 6 * scale;
        ctx.fillRect(barMarginLeft, barY, activeWidth, barHeight);
        ctx.shadowBlur = 0;

        ctx.restore();
      }
    };

    const drawScale = (): void => {
      const scaleY = 8 * scale + barHeight * 2 + 6 * scale;
      const scaleMarks = [-60, -36, -24, -12, 0];

      ctx.fillStyle = COLORS.scaleColor;
      ctx.font = `${8 * scale}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      scaleMarks.forEach((mark) => {
        const db = typeof mark === "string" ? parseInt(mark) : mark;
        const x = dbToX(db);
        const displayText = typeof mark === "string" ? mark : mark.toString();
        ctx.fillText(displayText, x, scaleY);
      });
    };

    const draw = (): void => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const now = Date.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      // Clear canvas
      if (isVintage) {
        // Vintage gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, "#e8dcc8");
        bgGradient.addColorStop(1, "#d4c4a8");
        ctx.fillStyle = bgGradient;
      } else {
        ctx.fillStyle = COLORS.background;
      }
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 8 * scale);
      ctx.fill();

      // Vintage border
      if (isVintage) {
        ctx.strokeStyle = "#3d3022";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      let targetDbL = MIN_DB;
      let targetDbR = MIN_DB;

      if (analyser) {
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        const halfLength = Math.floor(bufferLength / 2);

        if (mode === "peak") {
          let peakL = 0;
          let peakR = 0;
          for (let i = 0; i < bufferLength; i++) {
            const abs = Math.abs(dataArray[i]);
            if (i % 2 === 0) {
              if (abs > peakL) peakL = abs;
            } else {
              if (abs > peakR) peakR = abs;
            }
          }
          targetDbL = linearToDb(peakL);
          targetDbR = linearToDb(peakR);
        } else {
          let sumL = 0;
          let sumR = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = dataArray[i] * dataArray[i];
            if (i % 2 === 0) {
              sumL += val;
            } else {
              sumR += val;
            }
          }
          const rmsL = Math.sqrt(sumL / halfLength);
          const rmsR = Math.sqrt(sumR / halfLength);
          targetDbL = linearToDb(rmsL);
          targetDbR = linearToDb(rmsR);
        }

        targetDbL = Math.max(MIN_DB, Math.min(MAX_DB, targetDbL));
        targetDbR = Math.max(MIN_DB, Math.min(MAX_DB, targetDbR));
      }

      // Apply smoothing
      smoothedLevelL.current = smoothLevel(
        smoothedLevelL.current,
        targetDbL,
        deltaTime,
      );
      smoothedLevelR.current = smoothLevel(
        smoothedLevelR.current,
        targetDbR,
        deltaTime,
      );

      // Draw channels
      drawChannel("L", smoothedLevelL.current, 8 * scale);
      drawChannel(
        "R",
        smoothedLevelR.current,
        8 * scale + barHeight + 4 * scale,
      );

      // Draw scale
      drawScale();
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    analyser,
    mode,
    width,
    scale,
    height,
    barHeight,
    barMarginLeft,
    barMarginRight,
    barWidth,
    isVintage,
    COLORS,
  ]);

  return (
    <div className="flex flex-col items-center gap-1.5 mt-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width, height }}
        className="block"
      />
      {label && (
        <div className="text-xs text-text-secondary text-center">{label}</div>
      )}
    </div>
  );
}

export default StereoMeter;
