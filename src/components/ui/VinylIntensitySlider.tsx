/**
 * VinylIntensitySlider - Mini vertical slider for vinyl mode intensity control
 *
 * Controls the amount of slowdown applied in vinyl mode:
 * - 0.0 = no slowdown (rate 1.0)
 * - 0.3 = sweet spot (~-8% speed)
 * - 1.0 = full 45→33 RPM (~-27% speed)
 */

import { memo, useCallback, useMemo, useRef } from "react";

// Full vinyl ratio: 33⅓ / 45 ≈ 0.733
const VINYL_RATIO_FULL = 33 / 45;

// Vinyl amber color (matches VinylDisc)
const VINYL_COLOR = "#F5A524";
const TRACK_COLOR = "#1a1612";

interface VinylIntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
  visible: boolean;
}

function VinylIntensitySliderComponent({
  value,
  onChange,
  visible,
}: VinylIntensitySliderProps): JSX.Element {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Convert value (0-1) to position (0-100%)
  const currentPosition = value * 100;

  // Calculate speed percentage for tooltip
  const speedPercent = useMemo(() => {
    const ratio = 1.0 - value * (1.0 - VINYL_RATIO_FULL);
    return Math.round((ratio - 1) * 100);
  }, [value]);

  const handlePointerEvent = useCallback(
    (clientY: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      // Invert: top = 1.0, bottom = 0.0
      const position = Math.max(0, Math.min(1, 1 - relativeY / rect.height));
      // Round to 0.01 steps
      const rounded = Math.round(position * 100) / 100;
      onChange(rounded);
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handlePointerEvent(e.clientY);
    },
    [handlePointerEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      handlePointerEvent(e.clientY);
    },
    [handlePointerEvent],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Double-click resets to default (0.3)
  const handleDoubleClick = useCallback(() => {
    onChange(0.3);
  }, [onChange]);

  const sliderHeight = 48;
  const trackWidth = 4;
  const thumbSize = 14;

  return (
    <div
      className={`
        flex items-center justify-center transition-all duration-200 ease-out
        ${visible ? "opacity-100 w-6 mr-1" : "opacity-0 w-0 pointer-events-none"}
        overflow-hidden
      `}
      title={`${speedPercent}% speed (double-click to reset)`}
    >
      <div
        ref={sliderRef}
        className="relative cursor-pointer touch-none"
        style={{ width: 24, height: sliderHeight }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-label="Vinyl intensity"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={value}
        tabIndex={visible ? 0 : -1}
      >
        {/* Track background with inset shadow */}
        <div
          className="absolute left-1/2 rounded-full"
          style={{
            width: trackWidth,
            height: "100%",
            transform: "translateX(-50%)",
            background: TRACK_COLOR,
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        />

        {/* Active fill (from bottom) with glow */}
        <div
          className="absolute left-1/2 rounded-full transition-all duration-75"
          style={{
            width: trackWidth,
            height: `${currentPosition}%`,
            bottom: 0,
            transform: "translateX(-50%)",
            background: `linear-gradient(to top, ${VINYL_COLOR}, #d4891a)`,
            boxShadow: `0 0 8px ${VINYL_COLOR}60`,
          }}
        />

        {/* Thumb with metallic look */}
        <div
          className="absolute left-1/2 transition-all duration-75"
          style={{
            width: thumbSize,
            height: thumbSize,
            bottom: `calc(${currentPosition}% - ${thumbSize / 2}px)`,
            transform: "translateX(-50%)",
            background: `radial-gradient(circle at 30% 30%, ${VINYL_COLOR}, #b8780f)`,
            borderRadius: "50%",
            boxShadow: `
              0 2px 4px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(0, 0, 0, 0.3),
              inset 0 1px 2px rgba(255, 255, 255, 0.3),
              0 0 10px ${VINYL_COLOR}50
            `,
          }}
        />

        {/* Tick marks for reference */}
        <div
          className="absolute left-0 w-1 h-px bg-white/20"
          style={{ bottom: "30%", transform: "translateX(-2px)" }}
        />
        <div
          className="absolute right-0 w-1 h-px bg-white/20"
          style={{ bottom: "30%", transform: "translateX(2px)" }}
        />
      </div>
    </div>
  );
}

export const VinylIntensitySlider = memo(VinylIntensitySliderComponent);
