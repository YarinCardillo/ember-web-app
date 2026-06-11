/**
 * App - Main application component
 */

import { useState, useEffect } from "react";
import { AmpRack } from "./components/layout/AmpRack";
import { SetupGuide } from "./components/layout/SetupGuide";
import { AboutModal } from "./components/layout/AboutModal";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";

function App(): JSX.Element {
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

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
