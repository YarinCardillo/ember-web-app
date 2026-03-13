/**
 * GradientBackground - Animated ambient blobs rendered behind all content.
 * Cards with backdrop-filter will refract these through the glass surface.
 */

export function GradientBackground(): JSX.Element {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        contain: "layout paint",
        transform: "translateZ(0)",
      }}
    >
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
    </div>
  );
}
