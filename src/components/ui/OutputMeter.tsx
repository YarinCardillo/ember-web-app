/**
 * OutputMeter - Premium horizontal LED segment meter
 * Used for output/DAC metering
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface OutputMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  mode?: "rms" | "peak";
  width?: number;
  segments?: number;
}

const MIN_DB = -60;
const MAX_DB = 6;
const DB_RANGE = MAX_DB - MIN_DB;

// Color thresholds in dB (same as StereoMeter)
const YELLOW_THRESHOLD = -12;
const RED_THRESHOLD = 0;

// Smoothing ballistics (ms)
const ATTACK_TIME = 15;
const RELEASE_TIME = 150;

// Colors
const COLORS = {
  green: "#4ADE80",
  greenDim: "#134e2a",
  yellow: "#FACC15",
  yellowDim: "#422f08",
  red: "#F87171",
  redDim: "#451a1a",
};

export function OutputMeter({
  analyser,
  label = "Output",
  mode = "peak",
  width = 280,
  segments = 18,
}: OutputMeterProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const smoothedLevel = useRef(MIN_DB);
  const lastUpdateTime = useRef(Date.now());

  const scale = width / 280;
  const height = 50 * scale;

  // Calculate segment thresholds based on dB scale
  const yellowSegment = Math.floor(
    ((YELLOW_THRESHOLD - MIN_DB) / DB_RANGE) * segments,
  );
  const redSegment = Math.floor(
    ((RED_THRESHOLD - MIN_DB) / DB_RANGE) * segments,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 14 * scale;
    const segmentGap = 3 * scale;
    const totalGaps = (segments - 1) * segmentGap;
    const segmentWidth = (width - padding * 2 - totalGaps) / segments;
    const segmentHeight = 26 * scale;
    const segmentY = (height - segmentHeight) / 2;

    const getSegmentColor = (
      index: number,
      isActive: boolean,
    ): { bg: string; shadow: string } => {
      if (index >= redSegment) {
        return {
          bg: isActive ? COLORS.red : COLORS.redDim,
          shadow: isActive ? `0 0 8px ${COLORS.red}` : "none",
        };
      }
      if (index >= yellowSegment) {
        return {
          bg: isActive ? COLORS.yellow : COLORS.yellowDim,
          shadow: isActive ? `0 0 8px ${COLORS.yellow}` : "none",
        };
      }
      return {
        bg: isActive ? COLORS.green : COLORS.greenDim,
        shadow: isActive ? `0 0 8px ${COLORS.green}` : "none",
      };
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

    const draw = (): void => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const now = Date.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      // Clear canvas
      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 8 * scale);
      ctx.fill();

      let targetDb = MIN_DB;

      if (analyser) {
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        if (mode === "peak") {
          let peak = 0;
          for (let i = 0; i < bufferLength; i++) {
            const abs = Math.abs(dataArray[i]);
            if (abs > peak) {
              peak = abs;
            }
          }
          targetDb = linearToDb(peak);
        } else {
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rmsLevel = Math.sqrt(sum / bufferLength);
          targetDb = linearToDb(rmsLevel);
        }

        targetDb = Math.max(MIN_DB, Math.min(MAX_DB, targetDb));
      }

      // Apply smoothing
      smoothedLevel.current = smoothLevel(
        smoothedLevel.current,
        targetDb,
        deltaTime,
      );

      // Calculate active segments
      const normalizedLevel = (smoothedLevel.current - MIN_DB) / DB_RANGE;
      const activeSegments = Math.round(normalizedLevel * segments);

      // Draw segments
      for (let i = 0; i < segments; i++) {
        const x = padding + i * (segmentWidth + segmentGap);
        const isActive = i < activeSegments;
        const { bg, shadow } = getSegmentColor(i, isActive);

        if (isActive && shadow !== "none") {
          ctx.shadowColor = bg;
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(x, segmentY, segmentWidth, segmentHeight, 2 * scale);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
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
    segments,
    yellowSegment,
    redSegment,
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

export default OutputMeter;
