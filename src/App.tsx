/**
 * App - Main application component
 */

import { useState, useEffect } from 'react';
import { AmpRack } from './components/layout/AmpRack';
import { SetupGuide } from './components/layout/SetupGuide';
import { EmberSparks } from './components/ui/EmberSparks';

function App(): JSX.Element {
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Check if user has seen setup guide
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('ember-amp-seen-setup-guide');
    if (!hasSeenGuide) {
      setShowSetupGuide(true);
    }
  }, []);

  const handleCloseSetupGuide = (): void => {
    setShowSetupGuide(false);
    localStorage.setItem('ember-amp-seen-setup-guide', 'true');
  };

  const handleOpenSetupGuide = (): void => {
    setShowSetupGuide(true);
  };

  return (
    <>
      <EmberSparks />
      <AmpRack onHelpClick={handleOpenSetupGuide} />
      {showSetupGuide && <SetupGuide onClose={handleCloseSetupGuide} />}
    </>
  );
}

export default App;
