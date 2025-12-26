/**
 * Knob - Rotary control with drag interaction and skeuomorphic styling
 */

import { useState, useRef, useCallback, useEffect } from 'react';

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

export function Knob({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  formatValue,
  onChange,
  defaultValue,
}: KnobProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
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
    [formatValue, unit]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startYRef.current = e.clientY;
      startValueRef.current = value;
    },
    [value]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startYRef.current - e.clientY;
      const range = max - min;
      const sensitivity = range / 200; // Pixels to value ratio
      const deltaValue = deltaY * sensitivity;
      let newValue = startValueRef.current + deltaValue;

      // Apply step
      newValue = Math.round(newValue / step) * step;

      // Clamp
      newValue = Math.max(min, Math.min(max, newValue));

      onChange(newValue);
    },
    [isDragging, min, max, step, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        const newValue = Math.min(max, value + step);
        onChange(newValue);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const newValue = Math.max(min, value - step);
        onChange(newValue);
      }
    },
    [value, min, max, step, onChange]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate rotation angle (-150deg to +150deg for visual range)
  const normalizedValue = (value - min) / (max - min);
  const rotation = normalizedValue * 300 - 150; // -150 to +150 degrees

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={knobRef}
        className={`
          relative w-16 h-16 rounded-full
          bg-gradient-to-br from-gray-800 to-gray-900
          border-2 border-gray-700
          cursor-pointer select-none
          transition-all duration-150
          ${isDragging ? 'knob-glow-active scale-105' : 'knob-glow'}
          focus:outline-none focus:ring-2 focus:ring-ember-orange
        `}
        style={{ transform: `rotate(${rotation}deg)` }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        {/* Knob indicator */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-amber-glow rounded-full" />
      </div>
      <div className="text-center">
        <div className="text-xs text-text-light opacity-80">{label}</div>
        <div className="text-sm font-mono text-ember-orange">
          {formatDisplayValue(value)}
        </div>
      </div>
    </div>
  );
}

