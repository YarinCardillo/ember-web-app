/**
 * StereoMeterMinimal - Hybrid needle stereo meter
 * Based on ember-stereo-meter-minimal.html reference design
 * Features: needle indicator, peak hold, zone colors, tick marks
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface StereoMeterMinimalProps {
  analyserLeft: AnalyserNode | null;
  analyserRight: AnalyserNode | null;
  label?: string;
  mode?: "rms" | "peak";
}

const MIN_DB = -48;
const MAX_DB = 6;
const DB_RANGE = MAX_DB - MIN_DB;

// Attack/release times in ms - vintage meter is slightly slower
const ATTACK_TIME = 15;
const RELEASE_TIME = 150;

// Peak hold time in ms
const PEAK_HOLD_TIME = 1500;
const PEAK_DECAY_TIME = 300;

export function StereoMeterMinimal({
  analyserLeft,
  analyserRight,
  label = "Clipper",
  mode = "peak",
}: StereoMeterMinimalProps): JSX.Element {
  // Use refs for DOM elements to avoid re-renders
  const needleLRef = useRef<HTMLDivElement>(null);
  const needleRRef = useRef<HTMLDivElement>(null);
  const peakLRef = useRef<HTMLDivElement>(null);
  const peakRRef = useRef<HTMLDivElement>(null);

  const animationFrameRef = useRef<number>();
  const smoothedLevelL = useRef(MIN_DB);
  const smoothedLevelR = useRef(MIN_DB);
  const peakLevelL = useRef(MIN_DB);
  const peakLevelR = useRef(MIN_DB);
  const peakHoldTimeL = useRef(0);
  const peakHoldTimeR = useRef(0);
  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    const dbToPercent = (db: number): number => {
      const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
      return ((clamped - MIN_DB) / DB_RANGE) * 100;
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

    const updatePeak = (
      currentPeak: number,
      newLevel: number,
      holdTime: number,
      deltaTime: number,
    ): { peak: number; holdTime: number } => {
      if (newLevel > currentPeak) {
        return { peak: newLevel, holdTime: PEAK_HOLD_TIME };
      }
      if (holdTime > 0) {
        return { peak: currentPeak, holdTime: holdTime - deltaTime };
      }
      const decayFactor = 1 - Math.exp(-deltaTime / PEAK_DECAY_TIME);
      const decayedPeak = currentPeak + (MIN_DB - currentPeak) * decayFactor;
      return { peak: decayedPeak, holdTime: 0 };
    };

    const draw = (): void => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const now = Date.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;

      let targetDbL = MIN_DB;
      let targetDbR = MIN_DB;

      // Process left channel
      if (analyserLeft) {
        const bufferLengthL = analyserLeft.fftSize;
        const dataArrayL = new Float32Array(bufferLengthL);
        analyserLeft.getFloatTimeDomainData(dataArrayL);

        if (mode === "peak") {
          let peakValL = 0;
          for (let i = 0; i < bufferLengthL; i++) {
            const abs = Math.abs(dataArrayL[i]);
            if (abs > peakValL) peakValL = abs;
          }
          targetDbL = linearToDb(peakValL);
        } else {
          let sumL = 0;
          for (let i = 0; i < bufferLengthL; i++) {
            sumL += dataArrayL[i] * dataArrayL[i];
          }
          const rmsL = Math.sqrt(sumL / bufferLengthL);
          targetDbL = linearToDb(rmsL);
        }
        targetDbL = Math.max(MIN_DB, Math.min(MAX_DB, targetDbL));
      }

      // Process right channel
      if (analyserRight) {
        const bufferLengthR = analyserRight.fftSize;
        const dataArrayR = new Float32Array(bufferLengthR);
        analyserRight.getFloatTimeDomainData(dataArrayR);

        if (mode === "peak") {
          let peakValR = 0;
          for (let i = 0; i < bufferLengthR; i++) {
            const abs = Math.abs(dataArrayR[i]);
            if (abs > peakValR) peakValR = abs;
          }
          targetDbR = linearToDb(peakValR);
        } else {
          let sumR = 0;
          for (let i = 0; i < bufferLengthR; i++) {
            sumR += dataArrayR[i] * dataArrayR[i];
          }
          const rmsR = Math.sqrt(sumR / bufferLengthR);
          targetDbR = linearToDb(rmsR);
        }
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

      // Update peaks
      const peakResultL = updatePeak(
        peakLevelL.current,
        smoothedLevelL.current,
        peakHoldTimeL.current,
        deltaTime,
      );
      peakLevelL.current = peakResultL.peak;
      peakHoldTimeL.current = peakResultL.holdTime;

      const peakResultR = updatePeak(
        peakLevelR.current,
        smoothedLevelR.current,
        peakHoldTimeR.current,
        deltaTime,
      );
      peakLevelR.current = peakResultR.peak;
      peakHoldTimeR.current = peakResultR.holdTime;

      // Update DOM directly via refs (no re-render)
      const levelLPct = dbToPercent(smoothedLevelL.current);
      const levelRPct = dbToPercent(smoothedLevelR.current);
      const peakLPct = dbToPercent(peakLevelL.current);
      const peakRPct = dbToPercent(peakLevelR.current);

      if (needleLRef.current) {
        needleLRef.current.style.left = `${levelLPct}%`;
      }
      if (needleRRef.current) {
        needleRRef.current.style.left = `${levelRPct}%`;
      }
      if (peakLRef.current) {
        peakLRef.current.style.left = `${peakLPct}%`;
        peakLRef.current.style.opacity =
          peakLPct > 5 ? (peakLPct > levelLPct + 2 ? "0.9" : "0.6") : "0";
      }
      if (peakRRef.current) {
        peakRRef.current.style.left = `${peakRPct}%`;
        peakRRef.current.style.opacity =
          peakRPct > 5 ? (peakRPct > levelRPct + 2 ? "0.9" : "0.6") : "0";
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserLeft, analyserRight, mode]);

  const renderChannel = (
    channelLabel: string,
    needleRef: React.RefObject<HTMLDivElement>,
    peakRef: React.RefObject<HTMLDivElement>,
  ) => (
    <div className="stereo-channel">
      <span className="channel-label">{channelLabel}</span>
      <div className="hybrid-track">
        <div className="hybrid-zones">
          <div className="hybrid-zone green" />
          <div className="hybrid-zone yellow" />
          <div className="hybrid-zone red" />
        </div>
        <div className="hybrid-ticks">
          {/* Ticks at dB positions: -36=22.22%, -24=44.44%, -12=66.67%, 0=88.89% */}
          <div className="hybrid-tick" style={{ left: "22.22%" }} />
          <div className="hybrid-tick" style={{ left: "44.44%" }} />
          <div className="hybrid-tick" style={{ left: "66.67%" }} />
          <div className="hybrid-tick" style={{ left: "88.89%" }} />
        </div>
        <div ref={needleRef} className="hybrid-needle" style={{ left: "0%" }} />
        <div
          ref={peakRef}
          className="hybrid-peak"
          style={{ left: "0%", opacity: 0 }}
        />
      </div>
    </div>
  );

  return (
    <div className="meter-container">
      <style>{`
        .meter-container {
          background: #0a0908;
          border: 1px solid #1a1815;
          border-radius: 8px;
          padding: 14px 16px;
          box-shadow: inset 0 3px 10px rgba(0,0,0,0.7);
          width: 100%;
        }

        .stereo-channel {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .stereo-channel:last-of-type {
          margin-bottom: 0;
        }

        .channel-label {
          font-size: 10px;
          font-weight: 500;
          color: #4a4540;
          width: 14px;
        }

        .hybrid-track {
          flex: 1;
          height: 20px;
          background: linear-gradient(180deg, #121210 0%, #1a1815 100%);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }

        .hybrid-zones {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
        }

        .hybrid-zone {
          height: 100%;
          opacity: 0.12;
        }

        /* Zone widths based on dB scale (-48 to +6 dB, 54 dB total):
           Green: -48 to -12 dB = 36/54 = 66.67%
           Yellow: -12 to 0 dB = 12/54 = 22.22%
           Red: 0 to +6 dB = 6/54 = 11.11% */
        .hybrid-zone.green { width: 66.67%; background: #22c55e; }
        .hybrid-zone.yellow { width: 22.22%; background: #facc15; }
        .hybrid-zone.red { width: 11.11%; background: #ef4444; }

        .hybrid-ticks {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          pointer-events: none;
        }

        .hybrid-tick {
          position: absolute;
          width: 1px;
          height: 100%;
          background: #3a3530;
          transform: translateX(-50%);
        }

        .hybrid-needle {
          position: absolute;
          top: 2px;
          bottom: 2px;
          width: 3px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.9) 0%,
            #F5A524 40%,
            #F5A524 60%,
            rgba(255,255,255,0.9) 100%
          );
          border-radius: 1px;
          box-shadow:
            0 0 8px rgba(255, 255, 255, 0.7),
            0 0 16px rgba(245, 165, 36, 0.5);
          transition: left 0.08s ease-out;
          transform: translateX(-50%);
        }

        .hybrid-peak {
          position: absolute;
          top: 2px;
          bottom: 2px;
          width: 2px;
          background: #ef4444;
          border-radius: 1px;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
          transition: left 0.05s ease-out, opacity 0.3s ease;
          transform: translateX(-50%);
        }

        .meter-scale {
          position: relative;
          margin-top: 8px;
          margin-left: 24px;
          margin-right: 0;
          height: 12px;
        }

        .meter-scale span {
          position: absolute;
          font-size: 8px;
          color: #3a3530;
          transform: translateX(-50%);
        }

        .meter-scale span.red {
          color: #991b1b;
        }

        .meter-label {
          font-size: 10px;
          color: #4a4540;
          letter-spacing: 1px;
          text-transform: uppercase;
          text-align: center;
          margin-top: 8px;
        }
      `}</style>
      {renderChannel("L", needleLRef, peakLRef)}
      {renderChannel("R", needleRRef, peakRRef)}
      <div className="meter-scale">
        {/* Position labels on linear dB scale: (db - MIN_DB) / DB_RANGE * 100
            -48=0%, -36=22.22%, -24=44.44%, -12=66.67%, 0=88.89%, +6=100% */}
        <span style={{ left: "0%" }}>-48</span>
        <span style={{ left: "22.22%" }}>-36</span>
        <span style={{ left: "44.44%" }}>-24</span>
        <span style={{ left: "66.67%" }}>-12</span>
        <span style={{ left: "88.89%" }}>0</span>
        <span className="red" style={{ left: "100%" }}>
          +6
        </span>
      </div>
      {label && <div className="meter-label">{label}</div>}
    </div>
  );
}

export default StereoMeterMinimal;
