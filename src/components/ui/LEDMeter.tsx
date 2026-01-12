/**
 * LEDMeter - Premium compact horizontal LED-bar style meter
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface LEDMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  mode?: "rms" | "peak";
}

const LED_WIDTH = 330;
const LED_HEIGHT = 20;
const SEGMENT_COUNT = 18;
const LED_RADIUS = 6;
const SEGMENT_GAP = 6;

const SEGMENT_THRESHOLDS = [
  -60, -54, -48, -42, -36, -30, -24, -18, -12, -9, -6, -4, -2, 0, 2, 4, 6, 8,
];

// Premium color palette
const COLORS = {
  meterGreen: "#4ADE80",
  meterGreenDim: "#134e2a",
  meterYellow: "#FACC15",
  meterYellowDim: "#422f08",
  meterRed: "#F87171",
  meterRedDim: "#451a1a",
};

export function LEDMeter({
  analyser,
  label = "Out",
  mode = "rms",
}: LEDMeterProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = LED_WIDTH * dpr;
    canvas.height = LED_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const width = LED_WIDTH;
    const height = LED_HEIGHT;

    if (!analyser) {
      drawSegments(ctx, width, height, 0);
      return;
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const draw = (): void => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getFloatTimeDomainData(dataArray);

      let levelDb: number;

      if (mode === "peak") {
        let peak = 0;
        for (let i = 0; i < bufferLength; i++) {
          const abs = Math.abs(dataArray[i]);
          if (abs > peak) {
            peak = abs;
          }
        }
        levelDb = linearToDb(peak);
      } else {
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rmsLevel = Math.sqrt(sum / bufferLength);
        levelDb = linearToDb(rmsLevel);
      }

      let litSegments = 0;
      for (let i = 0; i < SEGMENT_THRESHOLDS.length; i++) {
        if (levelDb >= SEGMENT_THRESHOLDS[i]) {
          litSegments = i + 1;
        } else {
          break;
        }
      }

      drawSegments(ctx, width, height, litSegments);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, mode]);

  const drawSegments = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    litSegments: number,
  ): void => {
    ctx.clearRect(0, 0, width, height);

    const totalWidth =
      SEGMENT_COUNT * (LED_RADIUS * 2) + (SEGMENT_COUNT - 1) * SEGMENT_GAP;
    const startX = (width - totalWidth) / 2 + LED_RADIUS;
    const y = height / 2;

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const x = startX + i * (LED_RADIUS * 2 + SEGMENT_GAP);
      const isLit = i < litSegments;

      let litColor: string;
      let dimColor: string;

      if (i < 10) {
        litColor = COLORS.meterGreen;
        dimColor = COLORS.meterGreenDim;
      } else if (i < 14) {
        litColor = COLORS.meterYellow;
        dimColor = COLORS.meterYellowDim;
      } else {
        litColor = COLORS.meterRed;
        dimColor = COLORS.meterRedDim;
      }

      const color = isLit ? litColor : dimColor;

      // Draw LED with subtle 3D effect
      ctx.beginPath();
      ctx.arc(x, y, LED_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Add glow for lit segments
      if (isLit) {
        ctx.shadowColor = litColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, LED_RADIUS - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Add highlight for more depth
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, LED_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fill();
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 mt-2">
      <canvas
        ref={canvasRef}
        width={LED_WIDTH}
        height={LED_HEIGHT}
        style={{ width: LED_WIDTH, height: LED_HEIGHT }}
        className="block"
      />
      {label && (
        <div className="text-xs text-text-secondary text-center">{label}</div>
      )}
    </div>
  );
}
