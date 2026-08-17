// Shared icon mark for icon.tsx / apple-icon.tsx / icon-192.png / icon-512.png.
// Not a route — Next.js ignores files without a special export name, and the
// leading underscore makes that explicit.
//
// Renders the same crossed-swords mark used for the Matches nav icon, so the
// app icon and in-app iconography share one visual language. Each sword is
// drawn upright and rotated via a CSS transform on its wrapper (Satori, the
// renderer behind next/og's ImageResponse, supports that more reliably than
// an inline SVG <g transform>).
function sword(swordSize: number) {
  return (
    <svg viewBox="0 0 24 24" width={swordSize} height={swordSize} fill="none" stroke="#0b0e14" strokeWidth={1.5}>
      <path d="M12 1.5l2.6 8h-5.2z" strokeLinejoin="round" />
      <path d="M8 10.3h8" strokeLinecap="round" />
      <path d="M12 10.3v6.7" strokeLinecap="round" />
      <path d="M9.7 17.5h4.6" strokeLinecap="round" />
      <circle cx="12" cy="19.3" r="1.4" />
    </svg>
  );
}

export function iconMark(size: number) {
  const swordSize = size * 0.82;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ff4655",
        borderRadius: size * 0.22,
      }}
    >
      <div style={{ position: "relative", width: swordSize, height: swordSize, display: "flex" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", transform: "rotate(45deg)" }}>{sword(swordSize)}</div>
        <div style={{ position: "absolute", inset: 0, display: "flex", transform: "rotate(-45deg)" }}>{sword(swordSize)}</div>
      </div>
    </div>
  );
}
