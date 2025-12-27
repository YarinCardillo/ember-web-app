/**
 * TapeButton - Button with animated Ampex GIF
 * GIF plays when active, shows static first frame when inactive
 */

import { useEffect, useRef, useState } from 'react';

interface TapeButtonProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function TapeButton({ checked, onChange }: TapeButtonProps): JSX.Element {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [staticFrameLoaded, setStaticFrameLoaded] = useState(false);

  // Capture first frame of GIF - run when canvas is available
  useEffect(() => {
    // Only capture if we haven't already loaded
    if (staticFrameLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a fresh Image object to capture the first frame
    // This ensures we get frame 0 before animation starts
    const captureImg = new Image();
    
    const captureFrame = () => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use actual image dimensions
        const width = captureImg.naturalWidth || 48;
        const height = captureImg.naturalHeight || 48;
        
        // Set canvas size to match image
        canvas.width = width;
        canvas.height = height;
        
        // Draw the first frame immediately (before animation loop starts)
        ctx.drawImage(captureImg, 0, 0);
        setStaticFrameLoaded(true);
      } catch (error) {
        console.error('Failed to capture GIF frame:', error);
        setStaticFrameLoaded(false);
      }
    };

    // Capture immediately on load, synchronously before animation starts
    captureImg.onload = () => {
      // Small delay to ensure canvas is ready
      setTimeout(() => {
        captureFrame();
      }, 0);
    };
    
    // Handle error case
    captureImg.onerror = () => {
      console.error('Failed to load GIF for capture');
      setStaticFrameLoaded(false);
    };
    
    // Load with cache buster to ensure fresh load
    captureImg.src = `/assets/Ampex_orange_transparent.gif?t=${Date.now()}`;
  }, [staticFrameLoaded]);

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="
        relative flex items-center justify-center
        focus:outline-none
        transition-opacity duration-300
      "
      role="switch"
      aria-checked={checked}
      aria-label="Tape Sim"
      title="Tape Sim"
    >
      {/* Hidden image used to load GIF and capture first frame */}
      <img
        ref={imgRef}
        src="/assets/Ampex_orange_transparent.gif"
        alt=""
        className="hidden"
      />
      
      {/* Always render canvas (hidden when active) so we can draw to it */}
      <canvas
        ref={canvasRef}
        className="w-12 h-12 object-contain opacity-50"
        style={{ display: !checked && staticFrameLoaded ? 'block' : 'none' }}
      />
      
      {/* Show animated GIF when active */}
      {checked && (
        <img
          src="/assets/Ampex_orange_transparent.gif"
          alt="Tape simulation"
          className="w-12 h-12 object-contain"
        />
      )}
      
      {/* Placeholder while canvas loads when inactive */}
      {!checked && !staticFrameLoaded && (
        <div className="w-12 h-12 bg-gray-700/30 rounded opacity-50" />
      )}
    </button>
  );
}

