/**
 * VinylModeButton - "33 Mode" button with countdown timer and ring indicator
 */

import { useEffect, useCallback } from 'react';
import { useAudioStore } from '../../store/useAudioStore';

interface VinylModeButtonProps {
  onActivate?: () => void;
  onDeactivate?: () => void;
  disabled?: boolean;
}

const DURATION_SECONDS = 240; // 4 minutes

export function VinylModeButton({
  onActivate,
  onDeactivate,
  disabled = false,
}: VinylModeButtonProps): JSX.Element {
  const vinylMode = useAudioStore((state) => state.vinylMode);
  const setVinylModeRemainingTime = useAudioStore((state) => state.setVinylModeRemainingTime);
  const isRunning = useAudioStore((state) => state.isRunning);

  // Circle geometry
  const size = 40;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate progress (0 to 1)
  const progress = vinylMode.remainingTime / DURATION_SECONDS;

  // Handle countdown timer when active
  useEffect(() => {
    if (vinylMode.state !== 'active') return;

    const interval = setInterval(() => {
      const newTime = Math.max(0, vinylMode.remainingTime - 0.1);
      setVinylModeRemainingTime(newTime);

      // Auto-exit when time runs out
      if (newTime <= 0) {
        onDeactivate?.();
      }
    }, 100); // Update every 100ms for smooth animation

    return () => {
      clearInterval(interval);
    };
  }, [vinylMode.state, vinylMode.remainingTime, setVinylModeRemainingTime, onDeactivate]);

  const handleClick = useCallback(() => {
    if (disabled || !isRunning) return;

    if (vinylMode.state === 'idle') {
      onActivate?.();
    } else if (vinylMode.state === 'active') {
      // Manual exit
      onDeactivate?.();
    }
    // Ignore clicks during transitions
  }, [disabled, isRunning, vinylMode.state, onActivate, onDeactivate]);

  // Format time as M:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isActive = vinylMode.state === 'active' || vinylMode.state === 'entering' || vinylMode.state === 'exiting';
  const showCountdown = vinylMode.state === 'active';
  const isWarning = vinylMode.remainingTime <= 30; // Last 30 seconds
  const isDisabled = disabled || !isRunning || vinylMode.state === 'entering' || vinylMode.state === 'exiting';

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-full
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-amber-500/50
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive
          ? 'bg-amber-900/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          : 'bg-zinc-800/50 hover:bg-zinc-700/50'
        }
      `}
      aria-label={isActive ? `Vinyl mode active, ${formatTime(vinylMode.remainingTime)} remaining` : 'Activate vinyl mode'}
    >
      {/* Background circle track */}
      <svg
        className="absolute inset-0 rotate-90 -scale-x-100"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track (background) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-700/50"
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={`
            transition-all duration-100 ease-linear
            ${isWarning ? 'text-red-500' : 'text-amber-500'}
          `}
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        {showCountdown ? (
          <span className={`
            text-xs font-mono font-medium leading-none
            ${isWarning ? 'text-red-400' : 'text-amber-400'}
          `}>
            {formatTime(vinylMode.remainingTime)}
          </span>
        ) : (
          <span className={`
            text-xl font-light tracking-tight leading-none
            ${isActive ? 'text-amber-400' : 'text-zinc-400'}
          `}
          style={{ transform: 'translate(-0.5px, -0.5px)' }}
          >
            33
          </span>
        )}
      </div>

      {/* Vinyl grooves decoration (subtle) */}
      {isActive && (
        <div className="absolute inset-2 rounded-full border border-amber-500/10 pointer-events-none" />
      )}

      {/* Spin animation overlay */}
      {(vinylMode.state === 'entering' || vinylMode.state === 'exiting') && (
        <div 
          className={`
            absolute inset-0 rounded-full
            ${vinylMode.state === 'entering' ? 'animate-spin-slow-down' : 'animate-spin-speed-up'}
          `}
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(245,158,11,0.1) 50%, transparent 100%)'
          }}
        />
      )}
    </button>
  );
}

