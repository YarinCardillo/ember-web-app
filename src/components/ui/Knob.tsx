/**
 * Knob - Premium rotary control with arc indicator and skeuomorphic styling
 */

import { useState, useRef, useCallback, useEffect } from "react";

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

  return (
    <svg
      width={size}
      height={size}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
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
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth={ARC_STROKE_WIDTH}
        strokeLinecap="round"
      />

      {/* Value arc */}
      {valuePath && (
        <path
          d={valuePath}
          fill="none"
          stroke="url(#arcGradient)"
          strokeWidth={ARC_STROKE_WIDTH}
          strokeLinecap="round"
          filter={isActive ? "url(#arcGlow)" : undefined}
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

  // Fixed width for the entire knob component to prevent layout shifts
  const KNOB_CONTAINER_WIDTH = KNOB_SIZE + 24;

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ width: KNOB_CONTAINER_WIDTH }}
    >
      {/* Arc indicator container */}
      <div
        className="relative flex-shrink-0"
        style={{ width: KNOB_CONTAINER_WIDTH, height: KNOB_CONTAINER_WIDTH }}
      >
        <ArcIndicator
          normalizedValue={normalizedValue}
          size={KNOB_SIZE + 24}
          isActive={isActive}
        />

        {/* Knob */}
        <div
          ref={knobRef}
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            rounded-full radial-gradient-knob
            border border-white/10
            cursor-pointer select-none
            ${isDragging ? "knob-glow-active" : "knob-glow"}
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
            transition-transform duration-75 ease-out
          `}
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          }}
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
          {/* Inner ring for depth */}
          <div
            className="absolute inset-2 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.05), transparent 60%)",
            }}
          />
        </div>
      </div>

      {/* Labels */}
      <div className="text-center w-full">
        <div className="text-xs text-text-secondary truncate">{label}</div>
        <div className="text-sm font-mono text-accent-primary">
          {formatDisplayValue(value)}
        </div>
      </div>
    </div>
  );
}
