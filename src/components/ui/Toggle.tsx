/**
 * Toggle - Bypass switch with LED indicator
 */

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <div className="text-xs text-text-light opacity-80">{label}</div>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-6 rounded-full
          transition-all duration-300
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-orange
          ${checked ? 'bg-ember-orange' : 'bg-gray-700'}
        `}
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle'}
      >
        {/* Toggle thumb */}
        <div
          className={`
            absolute top-1 left-1 w-4 h-4 rounded-full
            bg-white transition-transform duration-300
            ${checked ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
        {/* LED indicator */}
        <div
          className={`
            absolute -top-1 -right-1 w-3 h-3 rounded-full
            transition-all duration-300
            ${checked ? 'bg-amber-glow shadow-lg shadow-amber-glow/50' : 'bg-gray-600'}
          `}
        />
      </button>
    </div>
  );
}

