/**
 * App - Main application component
 */

import { useState, useEffect } from "react";
import { AmpRack } from "./components/layout/AmpRack";
import { SetupGuide } from "./components/layout/SetupGuide";
import { AboutModal } from "./components/layout/AboutModal";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { useUiThemeStore } from "./store/useUiThemeStore";

function App(): JSX.Element {
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const theme = useUiThemeStore((state) => state.theme);

  // Resolve theme (system -> OS preference) and toggle the `.dark` class.
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (): void => {
      const dark = theme === "dark" || (theme === "system" && mql.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme !== "system") return;
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);

  // Check if user has seen setup guide
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("ember-amp-seen-setup-guide");
    if (!hasSeenGuide) {
      setShowSetupGuide(true);
    }
  }, []);

  const handleCloseSetupGuide = (): void => {
    setShowSetupGuide(false);
    localStorage.setItem("ember-amp-seen-setup-guide", "true");
  };

  const handleOpenSetupGuide = (): void => {
    setShowSetupGuide(true);
  };

  return (
    <ErrorBoundary>
      <AmpRack
        onHelpClick={handleOpenSetupGuide}
        onAboutClick={() => setShowAbout(true)}
      />
      {showSetupGuide && <SetupGuide onClose={handleCloseSetupGuide} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </ErrorBoundary>
  );
}

export default App;
