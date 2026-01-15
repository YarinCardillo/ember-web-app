/**
 * StereoMeterMinimal - Hybrid needle stereo meter
 * Based on ember-stereo-meter-minimal.html reference design
 * Features: needle indicator, peak hold, zone colors, tick marks
 */

import { useEffect, useRef } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface StereoMeterMinimalProps {
  analyser: AnalyserNode | null;
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
  analyser,
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

      if (analyser) {
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(dataArray);

        if (mode === "peak") {
          let peakValL = 0;
          let peakValR = 0;
          for (let i = 0; i < bufferLength; i++) {
            const abs = Math.abs(dataArray[i]);
            if (i % 2 === 0) {
              if (abs > peakValL) peakValL = abs;
            } else {
              if (abs > peakValR) peakValR = abs;
            }
          }
          targetDbL = linearToDb(peakValL);
          targetDbR = linearToDb(peakValR);
        } else {
          let sumL = 0;
          let sumR = 0;
          const halfLength = Math.floor(bufferLength / 2);
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
  }, [analyser, mode]);

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
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className={`hybrid-tick ${i % 2 === 0 ? "major" : ""}`}
            />
          ))}
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

        /* Zone proportions based on dB scale (-48 to +6 dB, 54 dB total):
           Green: -48 to -12 dB = 36 dB = 66.7% (flex 6)
           Yellow: -12 to 0 dB = 12 dB = 22.2% (flex 2)
           Red: 0 to +6 dB = 6 dB = 11.1% (flex 1) */
        .hybrid-zone.green { flex: 6; background: #22c55e; }
        .hybrid-zone.yellow { flex: 2; background: #facc15; }
        .hybrid-zone.red { flex: 1; background: #ef4444; }

        .hybrid-ticks {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          display: flex;
          justify-content: space-between;
          padding: 0 6px;
          pointer-events: none;
        }

        .hybrid-tick {
          width: 1px;
          height: 100%;
          background: #2a2520;
        }

        .hybrid-tick.major {
          height: 6px;
          background: #3a3530;
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
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          padding: 0 6px 0 24px;
        }

        .meter-scale span {
          font-size: 8px;
          color: #3a3530;
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
        <span>-48</span>
        <span>-36</span>
        <span>-24</span>
        <span>-12</span>
        <span>0</span>
        <span className="red">+6</span>
      </div>
      {label && <div className="meter-label">{label}</div>}
    </div>
  );
}

export default StereoMeterMinimal;
