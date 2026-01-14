/**
 * Knob - Premium rotary control with arc indicator and skeuomorphic styling
 * Supports both modern and vintage themes
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useThemeStore } from "../../store/useThemeStore";

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  defaultValue?: number;
}

interface ArcIndicatorProps {
  normalizedValue: number;
  size: number;
  isActive: boolean;
  isVintage: boolean;
}

const KNOB_SIZE = 56;
const ARC_RADIUS = 32;
const ARC_STROKE_WIDTH = 2.5;
const START_ANGLE = -135;
const END_ANGLE = 135;
const TOTAL_ARC = END_ANGLE - START_ANGLE;

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function ArcIndicator({
  normalizedValue,
  size,
  isActive,
  isVintage,
}: ArcIndicatorProps): JSX.Element {
  const center = size / 2;
  const valueAngle = START_ANGLE + normalizedValue * TOTAL_ARC;

  const backgroundPath = describeArc(
    center,
    center,
    ARC_RADIUS,
    START_ANGLE,
    END_ANGLE,
  );
  const valuePath =
    normalizedValue > 0.01
      ? describeArc(center, center, ARC_RADIUS, START_ANGLE, valueAngle)
      : "";

  const gradientId = isVintage ? "arcGradientVintage" : "arcGradient";
  const filterId = isVintage ? "arcGlowVintage" : "arcGlow";

  return (
    <svg
      width={size}
      height={size}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isVintage ? "#F5A524" : "#F59E0B"} />
          <stop offset="100%" stopColor={isVintage ? "#d4890a" : "#FBBF24"} />
        </linearGradient>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background arc */}
      <path
        d={backgroundPath}
        fill="none"
        stroke={isVintage ? "rgba(42, 37, 32, 0.8)" : "rgba(255, 255, 255, 0.08)"}
        strokeWidth={ARC_STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Value arc */}
      {valuePath && (
        <path
          d={valuePath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={ARC_STROKE_WIDTH}
          strokeLinecap="round"
          filter={isActive ? `url(#${filterId})` : undefined}
          style={{
            opacity: isActive ? 1 : 0.85,
            transition: "opacity 0.15s ease-out",
          }}
        />
      )}
    </svg>
  );
}

export function Knob({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "",
  formatValue,
  onChange,
  defaultValue,
}: KnobProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const isVintage = theme === "vintage";

  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const formatDisplayValue = useCallback(
    (val: number): string => {
      if (formatValue) {
        return formatValue(val);
      }
      return `${val.toFixed(1)}${unit}`;
    },
    [formatValue, unit],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.clientY;
      startValueRef.current = value;
    },
    [value],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.touches[0].clientY;
      startValueRef.current = value;
    },
    [value],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startYRef.current - e.clientY;
      const range = max - min;
      const sensitivity = range / 200;
      const deltaValue = deltaY * sensitivity;
      let newValue = startValueRef.current + deltaValue;

      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));

      onChange(newValue);
    },
    [isDragging, min, max, step, onChange],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const deltaY = startYRef.current - e.touches[0].clientY;
      const range = max - min;
      const sensitivity = range / 200;
      const deltaValue = deltaY * sensitivity;
      let newValue = startValueRef.current + deltaValue;

      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));

      onChange(newValue);
    },
    [isDragging, min, max, step, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        const newValue = Math.min(max, value + step);
        onChange(newValue);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        const newValue = Math.max(min, value - step);
        onChange(newValue);
      }
    },
    [value, min, max, step, onChange],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchcancel", handleTouchEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("touchcancel", handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const normalizedValue = (value - min) / (max - min);
  const rotation = normalizedValue * 300 - 150;
  const isActive = isDragging || isHovered;

  // Vintage theme knob styles
  const vintageKnobStyle = {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    background: `conic-gradient(
      from 0deg,
      #252520 0deg, #353530 20deg,
      #252520 40deg, #353530 60deg,
      #252520 80deg, #353530 100deg,
      #252520 120deg, #353530 140deg,
      #252520 160deg, #353530 180deg,
      #252520 200deg, #353530 220deg,
      #252520 240deg, #353530 260deg,
      #252520 280deg, #353530 300deg,
      #252520 320deg, #353530 340deg,
      #252520 360deg
    )`,
    boxShadow: isDragging
      ? "0 4px 12px rgba(0,0,0,0.5), 0 0 12px rgba(245, 165, 36, 0.3), inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.2)"
      : "0 4px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.05), inset 0 -2px 4px rgba(0,0,0,0.2)",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Arc indicator container */}
      <div
        className="relative"
        style={{ width: KNOB_SIZE + 24, height: KNOB_SIZE + 24 }}
      >
        <ArcIndicator
          normalizedValue={normalizedValue}
          size={KNOB_SIZE + 24}
          isActive={isActive}
          isVintage={isVintage}
        />

        {/* Knob */}
        <div
          ref={knobRef}
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            rounded-full
            cursor-pointer select-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
            transition-transform duration-75 ease-out
            ${!isVintage ? `radial-gradient-knob border border-white/10 ${isDragging ? "knob-glow-active" : "knob-glow"}` : ""}
          `}
          style={
            isVintage
              ? vintageKnobStyle
              : {
                  width: KNOB_SIZE,
                  height: KNOB_SIZE,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                }
          }
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          tabIndex={0}
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        >
          {isVintage ? (
            <>
              {/* Center cap with amber ring */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: 18,
                  height: 18,
                  background:
                    "radial-gradient(circle, #151510 0%, #0a0a08 100%)",
                  border: "1px solid #F5A524",
                  boxShadow: "0 0 8px rgba(245, 165, 36, 0.2)",
                }}
              />
              {/* Indicator line */}
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 3,
                  height: 10,
                  background: "#F5A524",
                  borderRadius: 2,
                  boxShadow: "0 0 6px rgba(245, 165, 36, 0.8)",
                }}
              />
            </>
          ) : (
            /* Modern theme inner ring */
            <div
              className="absolute inset-2 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05), transparent 60%)",
              }}
            />
          )}
        </div>
      </div>

      {/* Labels */}
      <div className="text-center">
        <div className="text-xs text-text-secondary">{label}</div>
        <div
          className={`text-sm font-mono min-w-[70px] ${isVintage ? "value-pill" : "text-accent-primary"}`}
        >
          {formatDisplayValue(value)}
        </div>
      </div>
    </div>
  );
}
