/**
 * ZoomDial - Right-side vertical jog wheel (face-on, a stack of fading ticks)
 * that scales the whole UI. Drag/scroll to zoom, with flick inertia and a soft
 * magnet toward the default (1.0). Hidden on small screens.
 */

import { useRef, useCallback, useEffect } from "react";
import {
  useUiZoomStore,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_DEFAULT,
} from "../../../store/useUiZoomStore";

const TICK_COUNT = 15;
const FADE =
  "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)";

// Physics
const FRICTION = 5.5; // velocity decay per second
const MAGNET_RANGE = 0.025; // pull toward default only within this narrow band
const MAGNET_K = 46; // magnet spring strength
const STOP_V = 0.0015;
const TARGET_K = 130; // glide spring toward a clicked level
const TARGET_DAMP = 15; // glide damping (overdamped -> no overshoot)
const DRAG_THRESHOLD_PX = 3;

export function ZoomDial(): JSX.Element {
  const setZoom = useUiZoomStore((state) => state.setZoom);
  const zoom = useUiZoomStore((state) => state.zoom);

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const velRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const lastMoveRef = useRef<{ t: number; z: number } | null>(null);
  const pointerDownRef = useRef(false);
  const draggingRef = useRef(false);
  const downYRef = useRef(0);

  const stopPhysics = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  }, []);

  const zoomFromY = useCallback((clientY: number): number => {
    const el = trackRef.current;
    if (!el) return ZOOM_DEFAULT;
    const r = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height));
    return ZOOM_MIN + frac * (ZOOM_MAX - ZOOM_MIN);
  }, []);

  // Physics loop: springs to a clicked target (glide), otherwise applies flick
  // inertia plus a soft magnet toward the default.
  const startPhysics = useCallback(() => {
    stopPhysics();
    let last = performance.now();
    const step = (now: number): void => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      const z0 = useUiZoomStore.getState().zoom;
      let v = velRef.current;
      const target = targetRef.current;
      const nearDefault = Math.abs(z0 - ZOOM_DEFAULT) < MAGNET_RANGE;

      if (target !== null) {
        v += (target - z0) * TARGET_K * dt;
        v *= Math.exp(-TARGET_DAMP * dt);
        if (Math.abs(z0 - target) < 0.0015 && Math.abs(v) < STOP_V) {
          targetRef.current = null; // reached -> hand off to magnet/inertia
        }
      } else {
        if (nearDefault) v += (ZOOM_DEFAULT - z0) * MAGNET_K * dt;
        v *= Math.exp(-FRICTION * dt);
      }

      let z = z0 + v * dt;
      if (z <= ZOOM_MIN) {
        z = ZOOM_MIN;
        v = 0;
      } else if (z >= ZOOM_MAX) {
        z = ZOOM_MAX;
        v = 0;
      }
      velRef.current = v;
      setZoom(z);

      const settled =
        targetRef.current === null &&
        Math.abs(v) < STOP_V &&
        (!nearDefault || Math.abs(z - ZOOM_DEFAULT) < 0.0025);
      if (settled) {
        if (Math.abs(z - ZOOM_DEFAULT) < MAGNET_RANGE) setZoom(ZOOM_DEFAULT);
        stopPhysics();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [setZoom, stopPhysics]);

  const handlePointerDown = (e: React.PointerEvent): void => {
    pointerDownRef.current = true;
    draggingRef.current = false;
    downYRef.current = e.clientY;
    velRef.current = 0;
    // A click glides smoothly to the clicked level; a drag overrides this.
    targetRef.current = zoomFromY(e.clientY);
    lastMoveRef.current = {
      t: performance.now(),
      z: useUiZoomStore.getState().zoom,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    startPhysics();
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent): void => {
    if (!pointerDownRef.current) return;
    if (!draggingRef.current) {
      if (Math.abs(e.clientY - downYRef.current) < DRAG_THRESHOLD_PX) return;
      draggingRef.current = true;
      targetRef.current = null; // cancel the click glide; follow the finger
      stopPhysics();
      lastMoveRef.current = {
        t: performance.now(),
        z: useUiZoomStore.getState().zoom,
      };
    }
    const z = zoomFromY(e.clientY);
    const now = performance.now();
    const prev = lastMoveRef.current;
    if (prev) {
      const dt = (now - prev.t) / 1000;
      if (dt > 0) velRef.current = (z - prev.z) / dt;
    }
    lastMoveRef.current = { t: now, z };
    setZoom(z);
  };

  const handlePointerUp = (e: React.PointerEvent): void => {
    if (!pointerDownRef.current) return;
    const wasDragging = draggingRef.current;
    pointerDownRef.current = false;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (wasDragging) startPhysics(); // flick inertia (click glide already runs)
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      stopPhysics();
      setZoom(zoom + 0.02);
      e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      stopPhysics();
      setZoom(zoom - 0.02);
      e.preventDefault();
    }
  };

  // Native non-passive wheel so we can prevent page scroll while zooming.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      stopPhysics();
      velRef.current = 0;
      setZoom(useUiZoomStore.getState().zoom - e.deltaY * 0.0006);
      startPhysics();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      stopPhysics();
    };
  }, [setZoom, startPhysics, stopPhysics]);

  const thumbPct = (1 - (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;

  return (
    <div className="fixed right-2 top-1/2 z-40 hidden -translate-y-1/2 select-none md:block">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="UI zoom"
        aria-valuemin={Math.round(ZOOM_MIN * 100)}
        aria-valuemax={Math.round(ZOOM_MAX * 100)}
        aria-valuenow={Math.round(zoom * 100)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => {
          stopPhysics();
          velRef.current = 0;
          setZoom(ZOOM_DEFAULT);
        }}
        onKeyDown={handleKeyDown}
        className="relative h-[240px] w-9 cursor-ns-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ WebkitMaskImage: FADE, maskImage: FADE }}
      >
        {/* Decorative ticks */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between py-1">
          {Array.from({ length: TICK_COUNT }).map((_, i) => (
            <span
              key={i}
              className="h-[2px] w-4 rounded-full bg-muted-foreground/45"
            />
          ))}
        </div>
        {/* Thumb */}
        <span
          className="pointer-events-none absolute left-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ top: `${thumbPct}%` }}
        />
      </div>
    </div>
  );
}
