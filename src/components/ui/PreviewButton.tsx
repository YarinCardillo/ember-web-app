/**
 * PreviewButton - Plays a demo audio file through the signal chain
 * Allows users to preview how the app sounds before setting up virtual cables
 */

interface PreviewButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function PreviewButton({
  isPlaying,
  isLoading,
  disabled,
  onToggle,
}: PreviewButtonProps): JSX.Element {
  return (
    <button
      onClick={onToggle}
      disabled={disabled || isLoading}
      className={`
        px-3 py-1.5 rounded text-xs font-medium
        transition-all duration-150
        ${isPlaying
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title="Play demo audio through the signal chain"
    >
      {isLoading ? (
        <span className="flex items-center gap-1">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" cy="12" r="10" 
              stroke="currentColor" 
              strokeWidth="4" 
              fill="none" 
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
            />
          </svg>
          Loading
        </span>
      ) : isPlaying ? (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
          Stop
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Preview
        </span>
      )}
    </button>
  );
}

