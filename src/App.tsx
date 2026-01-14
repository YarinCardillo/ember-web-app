/**
 * App - Main application component
 */

import { useState, useEffect } from "react";
import { AmpRack } from "./components/layout/AmpRack";
import { SetupGuide } from "./components/layout/SetupGuide";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { EmberSparks } from "./components/ui/EmberSparks";
import { useThemeStore } from "./store/useThemeStore";

function App(): JSX.Element {
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const theme = useThemeStore((state) => state.theme);

  // Apply theme to document body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
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
      <EmberSparks />
      <AmpRack onHelpClick={handleOpenSetupGuide} />
      {showSetupGuide && <SetupGuide onClose={handleCloseSetupGuide} />}
    </ErrorBoundary>
  );
}

export default App;
