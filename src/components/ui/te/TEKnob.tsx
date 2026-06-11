/**
 * TEKnob - Flat rotary control in the Teenage Engineering / cradle style.
 * Monochrome by design: ink value arc + indicator, neutral ticks, accent
 * appears only on keyboard focus. Theme-independent (single TE light theme).
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface TEKnobProps {
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

// --- Layout / tuning constants -------------------------------------------
// Adjust these to resize or retune the knob without touching render code.
const SIZE = 72; // knob box size in SVG units
const CENTER = SIZE / 2;
const RING_RADIUS = 27; // radius of the tick ring + value arc
const MIN_ANGLE = -135; // pointer angle at `min`
const MAX_ANGLE = 135; // pointer angle at `max` (270deg sweep)
const TICK_COUNT = 10; // tick marks around the ring
const DRAG_RANGE_PX = 140; // vertical pixels for a full min->max drag
/** Horizontal nudge of the whole value readout (number + unit). Tune to taste:
 *  negative = left, positive = right. e.g. "-3px", "0.4ch". */
const VALUE_OFFSET_X = "-12px";

/** Polar point on the knob face. 0deg points up; angle grows clockwise. */
function polar(angleDeg: number, radius: number): [number, number] {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

/** SVG arc path between two angles at the value-ring radius. */
function arcPath(fromAngle: number, toAngle: number): string {
    const [sx, sy] = polar(fromAngle, RING_RADIUS);
    const [ex, ey] = polar(toAngle, RING_RADIUS);
    const large = toAngle - fromAngle > 180 ? 1 : 0;
    return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${RING_RADIUS} ${RING_RADIUS} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}

/** Splits a formatted value into [numeric, unit] at the last space. */
function splitValue(s: string): [string, string] {
    const i = s.lastIndexOf(" ");
    return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, ""];
}

function clampToStep(
    raw: number,
    min: number,
    max: number,
    step: number,
): number {
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
}

export function TEKnob({
    label,
    value,
    min,
    max,
    step = 0.1,
    unit = "",
    formatValue,
    onChange,
    defaultValue,
}: TEKnobProps): JSX.Element {
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef(0);
    const startValueRef = useRef(0);

    const normalized = (value - min) / (max - min);
    const angle = MIN_ANGLE + normalized * (MAX_ANGLE - MIN_ANGLE);

    const ticks = useMemo(() => {
        const lines: Array<[number, number, number, number]> = [];
        for (let i = 0; i <= TICK_COUNT; i++) {
            const a = MIN_ANGLE + ((MAX_ANGLE - MIN_ANGLE) * i) / TICK_COUNT;
            const [x1, y1] = polar(a, RING_RADIUS + 3);
            const [x2, y2] = polar(a, RING_RADIUS + 6);
            lines.push([x1, y1, x2, y2]);
        }
        return lines;
    }, []);

    const [indX1, indY1] = polar(angle, 8.5);
    const [indX2, indY2] = polar(angle, RING_RADIUS - 6.5);
    const valuePath = normalized <= 0.001 ? "" : arcPath(MIN_ANGLE, angle);

    const handleDragStart = useCallback(
        (clientY: number) => {
            setIsDragging(true);
            startYRef.current = clientY;
            startValueRef.current = value;
        },
        [value],
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            handleDragStart(e.clientY);
        },
        [handleDragStart],
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault();
            handleDragStart(e.touches[0].clientY);
        },
        [handleDragStart],
    );

    const handleDoubleClick = useCallback(() => {
        if (defaultValue !== undefined) onChange(defaultValue);
    }, [defaultValue, onChange]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                e.preventDefault();
                onChange(Math.min(max, value + step));
            } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                e.preventDefault();
                onChange(Math.max(min, value - step));
            }
        },
        [value, min, max, step, onChange],
    );

    useEffect(() => {
        if (!isDragging) return;

        const applyDelta = (clientY: number): void => {
            const deltaPx = startYRef.current - clientY;
            const range = max - min;
            const next = startValueRef.current + (deltaPx / DRAG_RANGE_PX) * range;
            onChange(clampToStep(next, min, max, step));
        };
        const onMouseMove = (e: MouseEvent): void => applyDelta(e.clientY);
        const onTouchMove = (e: TouchEvent): void => {
            e.preventDefault();
            applyDelta(e.touches[0].clientY);
        };
        const onEnd = (): void => setIsDragging(false);

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onEnd);
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onEnd);
        window.addEventListener("touchcancel", onEnd);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onEnd);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onEnd);
            window.removeEventListener("touchcancel", onEnd);
        };
    }, [isDragging, min, max, step, onChange]);

    const fmt = useCallback(
        (v: number): string => (formatValue ? formatValue(v) : `${v.toFixed(1)}${unit}`),
        [formatValue, unit],
    );
    const displayValue = fmt(value);
    const [valueNumber, valueUnit] = splitValue(displayValue);

    // Fixed numeric width (mono chars) over the range endpoints. The number sits
    // center-aligned in this fixed box, so it stays centered under the knob; the
    // unit is positioned absolutely past the box edge, so it never shifts.
    const numberWidthCh = useMemo(
        () => Math.max(splitValue(fmt(min))[0].length, splitValue(fmt(max))[0].length),
        [fmt, min, max],
    );

    return (
        <div className="flex flex-col items-center gap-2 select-none">
            <div
                role="slider"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-valuetext={displayValue}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onDoubleClick={handleDoubleClick}
                onKeyDown={handleKeyDown}
                className="rounded-full outline-none cursor-ns-resize focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                style={{ touchAction: "none" }}
            >
                <svg
                    width={SIZE}
                    height={SIZE}
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    className="block"
                >
                    {ticks.map(([x1, y1, x2, y2], i) => (
                        <line
                            key={i}
                            x1={x1.toFixed(1)}
                            y1={y1.toFixed(1)}
                            x2={x2.toFixed(1)}
                            y2={y2.toFixed(1)}
                            className="stroke-border"
                            strokeWidth={1}
                        />
                    ))}
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={RING_RADIUS - 3}
                        className="fill-popover stroke-border"
                        strokeWidth={1}
                    />
                    {valuePath && (
                        <path
                            d={valuePath}
                            fill="none"
                            className="stroke-foreground"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                        />
                    )}
                    <line
                        x1={indX1.toFixed(1)}
                        y1={indY1.toFixed(1)}
                        x2={indX2.toFixed(1)}
                        y2={indY2.toFixed(1)}
                        className="stroke-foreground"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            <div className="flex flex-col items-center gap-0.5 leading-none">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                </span>
                <span
                    className="relative inline-flex justify-center whitespace-pre font-mono text-[11px] tabular-nums text-foreground"
                    style={{
                        minWidth: `${numberWidthCh}ch`,
                        transform: `translateX(${VALUE_OFFSET_X})`,
                    }}
                >
                    {valueNumber}
                    {valueUnit && (
                        <span className="absolute left-full ml-[0.35em] text-muted-foreground">
                            {valueUnit}
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
}
