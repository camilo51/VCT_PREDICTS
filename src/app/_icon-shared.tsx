// Shared icon mark for icon.tsx / apple-icon.tsx / icon-192.png / icon-512.png.
// Not a route — Next.js ignores files without a special export name, and the
// leading underscore makes that explicit.
export function iconMark(size: number) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ff4655",
        borderRadius: size * 0.2,
      }}
    >
      <div
        style={{
          color: "#0b0e14",
          fontSize: size * 0.62,
          fontWeight: 700,
          fontFamily: "sans-serif",
          lineHeight: 1,
        }}
      >
        V
      </div>
    </div>
  );
}
