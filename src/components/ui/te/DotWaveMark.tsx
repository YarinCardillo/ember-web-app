/**
 * DotWaveMark - HF-1 dot-wave brand mark. A row of circles tracing a wave.
 * Color follows the parent text color via `fill-*` utility classes.
 */

const ROWS = [0, 2, 3, 3, 2, 0, -2, -3, -3, -2, 0];

interface DotWaveMarkProps {
  pitch?: number;
  className?: string;
}

export function DotWaveMark({
  pitch = 3.6,
  className,
}: DotWaveMarkProps): JSX.Element {
  const n = ROWS.length;
  const r = pitch * 0.34;
  const width = (n - 1) * pitch + 2 * r;
  const height = 6 * pitch + 2 * r;
  const x0 = r;
  const y0 = height / 2;

  return (
    <svg
      viewBox={`0 0 ${width.toFixed(2)} ${height.toFixed(2)}`}
      className={className}
      role="img"
      aria-label="HF-1"
    >
      {ROWS.map((row, i) => (
        <circle
          key={i}
          cx={(x0 + i * pitch).toFixed(2)}
          cy={(y0 - row * pitch).toFixed(2)}
          r={r.toFixed(2)}
        />
      ))}
    </svg>
  );
}
