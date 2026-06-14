/**
 * OutputStage - Output bar: power and bypass transport on the left, the
 * segmented output meter in the middle, and the short-term LUFS readout with
 * signal / clip status on the right. Output level lives on the center Out knob
 * now, so there is no fader here; device pickers moved to the header menu.
 */

import { useState, useEffect, useRef } from "react";
import { Power } from "lucide-react";
import { TESegmentMeter } from "../ui/te/TESegmentMeter";
import {
    createLufsState,
    calculateShortTermLufs,
    formatLufs,
} from "../../utils/lufs-meter";
import { cn } from "@/lib/utils";
import type { LufsState } from "../../utils/lufs-meter";

const CLIP_HOLD_MS = 50; // short hold so brief clips stay visible

interface OutputStageProps {
    preClipperAnalyserLeft: AnalyserNode | null;
    preClipperAnalyserRight: AnalyserNode | null;
    postGainAnalyserLeft: AnalyserNode | null;
    isRunning: boolean;
    onPowerToggle: () => void;
    bypassAll: boolean;
    onBypassToggle: () => void;
}

interface StatusDotProps {
    label: string;
    active: boolean;
    tone: "brand" | "destructive";
}

function StatusDot({ label, active, tone }: StatusDotProps): JSX.Element {
    return (
        <div className="flex items-center gap-2">
            <span
                className={cn(
                    "size-2 rounded-full",
                    !active && "bg-border",
                    active && tone === "brand" && "bg-brand",
                    active && tone === "destructive" && "bg-destructive",
                )}
                style={
                    active && tone === "destructive"
                        ? { boxShadow: `0 0 0 3px hsl(var(--${tone}) / 0.14)` }
                        : undefined
                }
            />
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {label}
            </span>
        </div>
    );
}

export function OutputStage({
    preClipperAnalyserLeft,
    preClipperAnalyserRight,
    postGainAnalyserLeft,
    isRunning,
    onPowerToggle,
    bypassAll,
    onBypassToggle,
}: OutputStageProps): JSX.Element {
    const [outputLufs, setOutputLufs] = useState(-Infinity);
    const [hasSignal, setHasSignal] = useState(false);
    const [isClipping, setIsClipping] = useState(false);
    const animationRef = useRef<number>();
    const lufsStateRef = useRef<LufsState | null>(null);

    // LUFS short-term from post-gain analyser (left channel, mono-compatible).
    useEffect(() => {
        if (!postGainAnalyserLeft) return;

        if (!lufsStateRef.current) {
            lufsStateRef.current = createLufsState(
                postGainAnalyserLeft.context.sampleRate,
            );
        }

        const updateLevel = () => {
            const lufs = calculateShortTermLufs(
                postGainAnalyserLeft,
                lufsStateRef.current!,
            );
            setOutputLufs(lufs);
            setHasSignal(lufs > -60);
            animationRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [postGainAnalyserLeft]);

    // Clip detection from pre-clipper signal (peak > 0dB), either channel.
    // Instant attack on any over-0 peak, with a short hold so brief transients
    // stay visible without feeling laggy.
    const clipAnimationRef = useRef<number>();
    const clipHoldUntilRef = useRef(0);
    useEffect(() => {
        if (!preClipperAnalyserLeft) return;

        const dataArrayL = new Float32Array(preClipperAnalyserLeft.fftSize);
        const dataArrayR = preClipperAnalyserRight
            ? new Float32Array(preClipperAnalyserRight.fftSize)
            : null;

        const checkClipping = () => {
            preClipperAnalyserLeft.getFloatTimeDomainData(dataArrayL);
            if (preClipperAnalyserRight && dataArrayR) {
                preClipperAnalyserRight.getFloatTimeDomainData(dataArrayR);
            }

            let peakL = 0;
            for (let i = 0; i < dataArrayL.length; i++) {
                const abs = Math.abs(dataArrayL[i]);
                if (abs > peakL) peakL = abs;
            }

            let peakR = 0;
            if (dataArrayR) {
                for (let i = 0; i < dataArrayR.length; i++) {
                    const abs = Math.abs(dataArrayR[i]);
                    if (abs > peakR) peakR = abs;
                }
            }

            const peak = Math.max(peakL, peakR);
            const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
            const now = performance.now();
            if (peakDb > 0) clipHoldUntilRef.current = now + CLIP_HOLD_MS;
            setIsClipping(now < clipHoldUntilRef.current);
            clipAnimationRef.current = requestAnimationFrame(checkClipping);
        };

        checkClipping();
        return () => {
            if (clipAnimationRef.current) cancelAnimationFrame(clipAnimationRef.current);
        };
    }, [preClipperAnalyserLeft, preClipperAnalyserRight]);

    return (
        <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:gap-8">
            {/* Transport: power (red when on) + bypass (yellow when active) */}
            <div className="flex shrink-0 items-center gap-5">
                <button
                    onClick={onPowerToggle}
                    aria-label={isRunning ? "Power off" : "Power on"}
                    aria-pressed={isRunning}
                    title={isRunning ? "Power off" : "Power on"}
                    className={cn(
                        "flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isRunning
                            ? "text-red-500"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    <Power className="size-5" strokeWidth={2.25} />
                </button>
                <button
                    onClick={onBypassToggle}
                    aria-label="Bypass"
                    aria-pressed={bypassAll}
                    title="Bypass all processing"
                    className={cn(
                        "text-[11px] font-medium uppercase tracking-[0.16em] transition-colors focus-visible:outline-none",
                        bypassAll
                            ? "text-yellow-500"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    Bypass
                </button>
            </div>

            {/* Output meter */}
            <div className="min-w-0 flex-1">
                <TESegmentMeter
                    analyserLeft={preClipperAnalyserLeft}
                    analyserRight={preClipperAnalyserRight}
                />
            </div>

            {/* LUFS short-term + Signal / Clip status */}
            <div className="flex shrink-0 items-center justify-between gap-6 md:justify-end md:gap-8">
                <div className="flex flex-col items-start gap-0.5 md:items-end">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
                        Short Term
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="min-w-[5ch] text-right font-mono text-xl leading-none tabular-nums text-foreground">
                            {formatLufs(outputLufs)}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                            LUFS
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <StatusDot label="Signal" active={hasSignal} tone="brand" />
                    <StatusDot label="Clip" active={isClipping} tone="destructive" />
                </div>
            </div>
        </div>
    );
}
