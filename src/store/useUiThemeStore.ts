/**
 * UI theme store: system / light / dark, default system. Persists the choice;
 * the active `.dark` class is applied by an effect in App that resolves
 * `system` against the OS preference.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UiTheme = "system" | "light" | "dark";

const ORDER: UiTheme[] = ["system", "light", "dark"];

interface UiThemeState {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
  cycleTheme: () => void;
}

export const useUiThemeStore = create<UiThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const idx = ORDER.indexOf(get().theme);
        set({ theme: ORDER[(idx + 1) % ORDER.length] });
      },
    }),
    { name: "hf1-theme" },
  ),
);
