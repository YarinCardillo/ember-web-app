/**
 * UI zoom store: a single scale factor applied to the whole device panel.
 * Driven by the right-side zoom dial. Persisted so the choice survives reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Symmetric around the default so 1.0 sits at the dial's center.
export const ZOOM_DEFAULT = 1;
export const ZOOM_MIN = 0.82;
export const ZOOM_MAX = 1.18;

const clamp = (z: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

interface UiZoomState {
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const useUiZoomStore = create<UiZoomState>()(
  persist(
    (set) => ({
      zoom: ZOOM_DEFAULT,
      setZoom: (zoom) => set({ zoom: clamp(zoom) }),
    }),
    { name: "hf1-zoom" },
  ),
);
