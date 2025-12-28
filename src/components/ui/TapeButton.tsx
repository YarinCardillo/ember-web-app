/**
 * TapeButton - Button with animated Ampex GIF
 * GIF plays when active, shows static first frame when inactive
 * 
 * IMPORTANT: The img element is always mounted to prevent animation resets
 * from React re-renders. We use CSS visibility to show/hide.
 */

import { memo, useEffect, useRef, useState } from 'react';

interface TapeButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const GIF_SRC = '/assets/Ampex_orange_transparent.gif';

function TapeButtonComponent({ checked, onChange }: TapeButtonProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [staticFrameReady, setStaticFrameReady] = useState(false);

  // Capture first frame of GIF once on mount
  useEffect(() => {
    if (staticFrameReady) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      setStaticFrameReady(true);
    };
    
    img.src = GIF_SRC;
  }, [staticFrameReady]);

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative flex items-center justify-center focus:outline-none w-12 h-12"
      role="switch"
      aria-checked={checked}
      aria-label="Tape Sim"
      title="Tape Sim"
    >
      {/* Canvas for static first frame when inactive */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain opacity-50"
        style={{ 
          visibility: !checked && staticFrameReady ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }}
      />
      
      {/* Animated GIF - ALWAYS MOUNTED, visibility controlled by CSS */}
      <img
        src={GIF_SRC}
        alt="Tape simulation"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ 
          visibility: checked ? 'visible' : 'hidden',
          pointerEvents: 'none'
        }}
      />
    </button>
  );
}

// Memoize to prevent unnecessary re-renders from parent
export const TapeButton = memo(TapeButtonComponent);

