/**
 * VintageStereoMeter - Vintage analog-style stereo bar meter
 * Cream/amber colored meter matching the vintage theme
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface VintageStereoMeterProps {
  analyser: AnalyserNode | null;
  width?: number;
}

const MIN_DB = -20;
const MAX_DB = 3;
const DB_RANGE = MAX_DB - MIN_DB;

// Smoothing ballistics (ms)
const ATTACK_TIME = 15;
const RELEASE_TIME = 150;

export function VintageStereoMeter({
  analyser,
  width = 420,
}: VintageStereoMeterProps): JSX.Element {
  const leftFillRef = useRef<HTMLDivElement>(null);
  const rightFillRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const smoothedLevelL = useRef(MIN_DB);
  const smoothedLevelR = useRef(MIN_DB);
  const lastUpdateTime = useRef(Date.now());

  const smoothLevel = (
    current: number,
    target: number,
    deltaTime: number
  ): number => {
    const timeConstant = target > current ? ATTACK_TIME : RELEASE_TIME;
    const factor = 1 - Math.exp(-deltaTime / timeConstant);
    return current + (target - current) * factor;
  };

  const dbToPercent = (db: number): number => {
    const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
    return ((clamped - MIN_DB) / DB_RANGE) * 100;
  };

  useEffect(() => {
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const update = () => {
      animationFrameRef.current = requestAnimationFrame(update);

      const now = Date.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      analyser.getFloatTimeDomainData(dataArray);

      // Peak measurement per channel
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

      let targetDbL = linearToDb(peakL);
      let targetDbR = linearToDb(peakR);

      targetDbL = Math.max(MIN_DB, Math.min(MAX_DB, targetDbL));
      targetDbR = Math.max(MIN_DB, Math.min(MAX_DB, targetDbR));

      // Apply smoothing
      smoothedLevelL.current = smoothLevel(
        smoothedLevelL.current,
        targetDbL,
        deltaTime
      );
      smoothedLevelR.current = smoothLevel(
        smoothedLevelR.current,
        targetDbR,
        deltaTime
      );

      // Update fill widths
      if (leftFillRef.current) {
        leftFillRef.current.style.width = `${dbToPercent(smoothedLevelL.current)}%`;
      }
      if (rightFillRef.current) {
        rightFillRef.current.style.width = `${dbToPercent(smoothedLevelR.current)}%`;
      }
    };

    update();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser]);

  const scaleMarks = [
    { value: "-20", isRed: false },
    { value: "-10", isRed: false },
    { value: "-7", isRed: false },
    { value: "-5", isRed: false },
    { value: "-3", isRed: false },
    { value: "0", isRed: true },
    { value: "+3", isRed: true },
  ];

  return (
    <div
      className="meter-vintage-stereo"
      style={{
        width,
        background: "linear-gradient(180deg, #e8dcc8 0%, #d4c4a8 100%)",
        border: "2px solid #3d3022",
        borderRadius: 6,
        padding: "14px 18px",
        boxShadow:
          "inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.1)",
      }}
    >
      {/* Channel L */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 11,
            color: "#3d2e1a",
            width: 14,
            fontWeight: 500,
          }}
        >
          L
        </span>
        <div
          style={{
            flex: 1,
            height: 14,
            background: "#1a1815",
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
          }}
        >
          <div
            ref={leftFillRef}
            style={{
              height: "100%",
              width: "0%",
              background:
                "linear-gradient(90deg, #F5A524 0%, #fbbf24 50%, #ef4444 90%, #dc2626 100%)",
              borderRadius: 3,
              boxShadow: "0 0 12px rgba(245, 165, 36, 0.5)",
              transition: "width 0.05s ease-out",
            }}
          />
        </div>
      </div>

      {/* Channel R */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 11,
            color: "#3d2e1a",
            width: 14,
            fontWeight: 500,
          }}
        >
          R
        </span>
        <div
          style={{
            flex: 1,
            height: 14,
            background: "#1a1815",
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
          }}
        >
          <div
            ref={rightFillRef}
            style={{
              height: "100%",
              width: "0%",
              background:
                "linear-gradient(90deg, #F5A524 0%, #fbbf24 50%, #ef4444 90%, #dc2626 100%)",
              borderRadius: 3,
              boxShadow: "0 0 12px rgba(245, 165, 36, 0.5)",
              transition: "width 0.05s ease-out",
            }}
          />
        </div>
      </div>

      {/* Scale */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingLeft: 24,
          paddingRight: 4,
          marginTop: 6,
        }}
      >
        {scaleMarks.map((mark) => (
          <span
            key={mark.value}
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 9,
              color: mark.isRed ? "#991b1b" : "#5c4a2a",
            }}
          >
            {mark.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default VintageStereoMeter;
