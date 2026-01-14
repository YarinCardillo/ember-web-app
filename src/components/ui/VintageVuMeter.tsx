/**
 * VintageVuMeter - Premium analog needle-style VU meter with vintage aesthetics
 * Used for input metering with warm analog appearance
 */

import { useEffect, useRef, useMemo } from "react";
import { linearToDb } from "../../utils/dsp-math";

interface VintageVuMeterProps {
  analyser: AnalyserNode | null;
  label?: string;
  width?: number;
}

export function VintageVuMeter({
  analyser,
  label = "Input",
  width = 360,
}: VintageVuMeterProps): JSX.Element {
  const needleRef = useRef<HTMLDivElement>(null);
  const peakLedRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const currentAngleRef = useRef(-45);
  const lastUpdateTimeRef = useRef(Date.now());
  const peakBrightnessRef = useRef(0);
  const peakHoldTimeRef = useRef(0);

  const scale = width / 360;
  const height = 180 * scale;

  // VU meter scale: -20 to +3 dB
  const minDb = -20;
  const maxDb = 3;
  const minAngle = -25;
  const maxAngle = 25;

  // Memoize scale-dependent styles to avoid object recreation on each render
  const meterStyles = useMemo(
    () => ({
      container: {
        width,
        height,
        background: "linear-gradient(180deg, #1a1612 0%, #e1cf95 100%)",
        border: "2px solid #3d3022",
        borderRadius: 8 * scale,
        position: "relative" as const,
        overflow: "hidden" as const,
        boxShadow:
          "inset 0 0 80px rgba(245, 165, 36, 0.08), inset 0 -20px 40px rgba(0,0,0,0.3)",
      },
      svg: {
        position: "absolute" as const,
        top: 10 * scale,
        left: "50%",
        transform: "translateX(-50%)",
      },
      peakSection: {
        position: "absolute" as const,
        bottom: 12 * scale,
        right: 15 * scale,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center" as const,
        gap: 4 * scale,
      },
      plusSign: {
        color: "#991b1b",
        fontFamily: "Georgia, serif",
        fontSize: 14 * scale,
        fontWeight: "bold" as const,
      },
      peakLed: {
        width: 10 * scale,
        height: 10 * scale,
        borderRadius: "50%",
        background: "#3d1a1a",
        border: "1px solid #5c2a2a",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
      },
      peakLabel: {
        color: "#3d2e1a",
        fontFamily: "Georgia, serif",
        fontSize: 10 * scale,
        letterSpacing: 1,
      },
      needleSlot: {
        position: "absolute" as const,
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 200 * scale,
        height: 10 * scale,
        background: "linear-gradient(to bottom, #1a1612 0%, #0d0b09 100%)",
        borderRadius: `${4 * scale}px ${4 * scale}px 0 0`,
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
        zIndex: 5,
      },
      needle: {
        position: "absolute" as const,
        bottom: -160 * scale,
        left: "50%",
        width: 2 * scale,
        height: 300 * scale,
        background:
          "linear-gradient(to top, #8b0000 0%, #dc2626 8%, #ffffff 10%, #ffffff 100%)",
        transformOrigin: "bottom center",
        transform: `translateX(-50%) rotate(${minAngle}deg)`,
        borderRadius: 1,
        boxShadow:
          "0 0 8px rgba(255, 255, 255, 0.9), 0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)",
        zIndex: 6,
      },
      pivot: {
        position: "absolute" as const,
        bottom: -166 * scale,
        left: "50%",
        transform: "translateX(-50%)",
        width: 12 * scale,
        height: 12 * scale,
        background: "radial-gradient(circle, #333 0%, #1a1a1a 100%)",
        border: "1px solid #444",
        borderRadius: "50%",
        zIndex: 10,
      },
    }),
    [width, height, scale, minAngle],
  );

  // VU calibration: 0 VU = -18 dBFS (broadcast/pro-audio standard)
  const VU_REFERENCE_DBFS = -18;

  // Peak threshold (0 VU on display = -18 dBFS)
  const peakThresholdDb = 0;
  const peakHoldDuration = 1000; // ms
  const peakFallTime = 1500; // ms for full fade out

  // VU meter ballistics (IEC 60268-17: 99% in 300ms)
  // Exponential smoothing reaches 99% at 5τ, so τ = 300ms / 5 = 60ms
  const attackTime = 65;
  const releaseTime = 65;

  // SVG dimensions - wider arc with larger radius for flatter appearance
  const svgWidth = 360;
  const svgHeight = 140;
  const cx = 180;
  const cy = 320;
  const arcRadius = 300;
  const tickOuter = 300;
  const tickInnerMajor = 265;
  const tickInnerMinor = 278;
  const textRadius = 245;

  // Convert angle to SVG coordinates
  const angleToPoint = (angleDeg: number, r: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  // Create arc path
  const createArc = (r: number, startDeg: number, endDeg: number) => {
    const start = angleToPoint(startDeg, r);
    const end = angleToPoint(endDeg, r);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
  };

  // Scale marks - adjusted for -25 to +25 degree range (flatter arc)
  const marks = [
    { angle: -32, label: "20", isRed: false, isMajor: true },
    { angle: -21, label: "10", isRed: false, isMajor: true },
    { angle: -13, label: "7", isRed: false, isMajor: true },
    { angle: -6, label: "5", isRed: false, isMajor: true },
    { angle: 4, label: "3", isRed: false, isMajor: true },
    { angle: 14, label: "0", isRed: true, isMajor: true },
    { angle: 25, label: "3", isRed: true, isMajor: true },
  ];

  const minorTicks = [
    -30, -28, -26, -24, -19, -17, -15, -11, -9, -2, 0, 7, 11, 18, 21, 28, 32,
  ];

  useEffect(() => {
    if (!analyser || !needleRef.current) {
      if (needleRef.current) {
        needleRef.current.style.transform = `translateX(-50%) rotate(${minAngle}deg)`;
      }
      if (peakLedRef.current) {
        peakLedRef.current.style.background = "#3d1a1a";
        peakLedRef.current.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.5)";
      }
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

      // RMS measurement for VU meter behavior
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
        const abs = Math.abs(dataArray[i]);
        if (abs > peak) peak = abs;
      }
      const rmsLevel = Math.sqrt(sum / bufferLength);
      const rmsDbfs = linearToDb(rmsLevel);
      const peakDbfs = linearToDb(peak);

      // Convert dBFS to VU scale (0 VU = -18 dBFS)
      const rmsVu = rmsDbfs - VU_REFERENCE_DBFS;
      const peakVu = peakDbfs - VU_REFERENCE_DBFS;

      // Map to VU scale (-20 to +3)
      const clampedLevel = Math.max(minDb, Math.min(maxDb, rmsVu));
      const normalizedLevel = (clampedLevel - minDb) / (maxDb - minDb);
      const targetAngle = minAngle + normalizedLevel * (maxAngle - minAngle);

      // Apply VU meter ballistics
      const currentAngle = currentAngleRef.current;
      const angleDiff = targetAngle - currentAngle;
      const timeConstant = angleDiff > 0 ? attackTime : releaseTime;
      const smoothingFactor = 1 - Math.exp(-deltaTime / timeConstant);
      currentAngleRef.current = currentAngle + angleDiff * smoothingFactor;

      if (needleRef.current) {
        needleRef.current.style.transform = `translateX(-50%) rotate(${currentAngleRef.current}deg)`;
      }

      // Peak LED logic with hold and fade
      if (peakVu >= peakThresholdDb) {
        // New peak detected - full brightness and reset hold timer
        peakBrightnessRef.current = 1;
        peakHoldTimeRef.current = now;
      } else {
        const timeSincePeak = now - peakHoldTimeRef.current;
        if (timeSincePeak > peakHoldDuration) {
          // After hold time, start fading
          const fadeProgress =
            (timeSincePeak - peakHoldDuration) / peakFallTime;
          peakBrightnessRef.current = Math.max(0, 1 - fadeProgress);
        }
        // During hold time, brightness stays at current level
      }

      if (peakLedRef.current) {
        const brightness = peakBrightnessRef.current;
        if (brightness > 0) {
          // Interpolate colors based on brightness
          const r = Math.round(61 + (255 - 61) * brightness); // 61 = 0x3d (dim), 255 = full red
          const g = Math.round(26 + (68 - 26) * brightness); // 26 = 0x1a (dim), 68 = red component
          const b = Math.round(26 + (68 - 26) * brightness);
          peakLedRef.current.style.background = `radial-gradient(circle at 30% 30%, rgb(${r}, ${g}, ${b}), rgb(${Math.round(r * 0.86)}, ${Math.round(g * 0.6)}, ${Math.round(b * 0.6)}))`;
          peakLedRef.current.style.boxShadow = `0 0 ${8 * brightness}px rgba(220, 38, 38, ${brightness}), 0 0 ${16 * brightness}px rgba(220, 38, 38, ${brightness * 0.6})`;
        } else {
          peakLedRef.current.style.background = "#3d1a1a";
          peakLedRef.current.style.boxShadow =
            "inset 0 1px 2px rgba(0,0,0,0.5)";
        }
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Reset refs to prevent visual jumps when analyser changes
      currentAngleRef.current = minAngle;
      peakBrightnessRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyser]);

  const svgContent = useMemo(() => {
    const elements: JSX.Element[] = [];

    // Main arc
    elements.push(
      <path
        key="main-arc"
        d={createArc(arcRadius, -32, 32)}
        fill="none"
        stroke="#2a2015"
        strokeWidth="1.5"
      />,
    );

    // Red zone arc
    elements.push(
      <path
        key="red-arc"
        d={createArc(arcRadius - 8, 14, 32)}
        fill="none"
        stroke="#991b1b"
        strokeWidth="8"
        strokeLinecap="butt"
      />,
    );

    // Major tick marks and labels
    marks.forEach(({ angle, label: markLabel, isRed, isMajor }, i) => {
      const outer = angleToPoint(angle, tickOuter);
      const inner = angleToPoint(
        angle,
        isMajor ? tickInnerMajor : tickInnerMinor,
      );
      const textPos = angleToPoint(angle, textRadius);

      elements.push(
        <line
          key={`tick-${i}`}
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          stroke={isRed ? "#991b1b" : "#2a2015"}
          strokeWidth={isMajor ? 2 : 1.5}
        />,
      );

      if (markLabel) {
        elements.push(
          <text
            key={`label-${i}`}
            x={textPos.x}
            y={textPos.y}
            fill={isRed ? "#991b1b" : "#3d2e1a"}
            fontFamily="Georgia, serif"
            fontSize={markLabel === "0" ? 15 : 13}
            fontWeight={markLabel === "0" ? "bold" : "normal"}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {markLabel}
          </text>,
        );
      }
    });

    // Minor tick marks
    minorTicks.forEach((angle, i) => {
      const outer = angleToPoint(angle, tickOuter);
      const inner = angleToPoint(angle, tickInnerMinor);
      const isRed = angle > 14;

      elements.push(
        <line
          key={`minor-${i}`}
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          stroke={isRed ? "#991b1b" : "#2a2015"}
          strokeWidth={1}
        />,
      );
    });

    // VU label - positioned below the scale arc
    elements.push(
      <text
        key="vu-label"
        x={cx}
        y={115}
        fill="#2a2015"
        fontFamily="Georgia, serif"
        fontSize={22}
        fontWeight="bold"
        textAnchor="middle"
        letterSpacing={6}
      >
        VU
      </text>,
    );

    return elements;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div
          className="text-xs text-text-secondary"
          id={`vu-meter-label-${label}`}
        >
          {label}
        </div>
      )}
      <div
        style={meterStyles.container}
        role="meter"
        aria-label={`${label} VU meter`}
        aria-labelledby={label ? `vu-meter-label-${label}` : undefined}
        aria-valuemin={minDb}
        aria-valuemax={maxDb}
        aria-valuenow={0}
        aria-valuetext="Audio level meter"
      >
        {/* Scale SVG */}
        <svg
          width={svgWidth * scale}
          height={svgHeight * scale}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={meterStyles.svg}
        >
          {svgContent}
        </svg>

        {/* Peak indicator section (+ sign and LED) */}
        <div style={meterStyles.peakSection}>
          {/* + sign */}
          <span style={meterStyles.plusSign}>+</span>
          {/* Peak LED */}
          <div ref={peakLedRef} style={meterStyles.peakLed} />
          {/* PEAK label */}
          <span style={meterStyles.peakLabel}>PEAK</span>
        </div>

        {/* Needle slot - dark opening where needle emerges */}
        <div style={meterStyles.needleSlot} />

        {/* Glowing White Needle with Red Base */}
        <div ref={needleRef} style={meterStyles.needle} />

        {/* Pivot */}
        <div style={meterStyles.pivot} />
      </div>
    </div>
  );
}

export default VintageVuMeter;
