/**
 * LEDMeter - Compact horizontal LED-bar style meter
 * Shows final output level (post-clipper, post-gain)
 */

import { useEffect, useRef } from 'react';
import { linearToDb } from '../../utils/dsp-math';

interface LEDMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  mode?: 'rms' | 'peak';  // RMS for average level, peak for transients
}

const LED_WIDTH = 330;   // Horizontal width (increased for more LEDs)
const LED_HEIGHT = 20;   // Thin bar
const SEGMENT_COUNT = 18;  // More LEDs
const LED_RADIUS = 6;    // Circular LED radius
const SEGMENT_GAP = 6;   // Gap between circular LEDs

// Segment thresholds in dB (18 segments: 10 green, 4 yellow, 4 red)
const SEGMENT_THRESHOLDS = [-60, -54, -48, -42, -36, -30, -24, -18, -12, -9, -6, -4, -2, 0, 2, 4, 6, 8];

export function LEDMeter({
  analyser,
  label = 'Out',
  mode = 'rms',
}: LEDMeterProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LED_WIDTH * dpr;
    canvas.height = LED_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const width = LED_WIDTH;
    const height = LED_HEIGHT;

    // If no analyser, just draw empty segments
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
      
      if (mode === 'peak') {
        // Calculate peak level (absolute maximum)
        let peak = 0;
        for (let i = 0; i < bufferLength; i++) {
          const abs = Math.abs(dataArray[i]);
          if (abs > peak) {
            peak = abs;
          }
        }
        levelDb = linearToDb(peak);
      } else {
        // Calculate RMS level (average)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rmsLevel = Math.sqrt(sum / bufferLength);
        levelDb = linearToDb(rmsLevel);
      }

      // Determine how many segments should be lit
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
    litSegments: number
  ): void => {
    ctx.clearRect(0, 0, width, height);

    const totalWidth = SEGMENT_COUNT * (LED_RADIUS * 2) + (SEGMENT_COUNT - 1) * SEGMENT_GAP;
    const startX = (width - totalWidth) / 2 + LED_RADIUS;
    const y = height / 2;

    // Draw circular LEDs from left to right
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const x = startX + i * (LED_RADIUS * 2 + SEGMENT_GAP);
      const isLit = i < litSegments;

      // Determine segment color based on position
      let color: string;
      if (i < 10) {
        // Green LEDs (left)
        color = isLit ? '#22c55e' : '#1a3a1a';
      } else if (i < 14) {
        // Yellow LEDs (middle)
        color = isLit ? '#eab308' : '#3a3a1a';
      } else {
        // Red LEDs (right)
        color = isLit ? '#ef4444' : '#3a1a1a';
      }

      // Draw circular LED
      ctx.beginPath();
      ctx.arc(x, y, LED_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Add subtle glow for lit segments
      if (isLit) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, LED_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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
      {label && <div className="text-xs text-text-light opacity-80 text-center">{label}</div>}
    </div>
  );
}

