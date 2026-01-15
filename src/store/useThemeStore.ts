/**
 * Zustand store for theme state management
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeType = "vintage" | "modern";

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "vintage", // Default to vintage theme
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "vintage" ? "modern" : "vintage",
        })),
    }),
    {
      name: "ember-theme-storage",
    },
  ),
);
