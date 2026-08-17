export function DuelBar({
  leftLabel,
  rightLabel,
  leftPct,
  rightPct,
  size = "md",
}: {
  leftLabel?: string;
  rightLabel?: string;
  leftPct: number;
  rightPct: number;
  size?: "sm" | "md" | "lg";
}) {
  const total = leftPct + rightPct || 1;
  const l = (leftPct / total) * 100;
  const r = 100 - l;
  const height = size === "lg" ? "h-2.5" : size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="w-full">
      {(leftLabel || rightLabel) && (
        <div className="flex items-baseline justify-between gap-2 mb-1.5 font-display text-sm tracking-wide">
          <span className="min-w-0 truncate text-team-a">
            {leftLabel} <span className="font-data text-xs text-text-dim">{Math.round(leftPct)}%</span>
          </span>
          <span className="min-w-0 truncate text-team-b text-right">
            <span className="font-data text-xs text-text-dim">{Math.round(rightPct)}%</span> {rightLabel}
          </span>
        </div>
      )}
      <div className={`flex w-full overflow-hidden rounded-full bg-bg-elevated-2 ${height}`}>
        <div className="bg-team-a transition-[width] duration-500" style={{ width: `${l}%` }} />
        <div className="bg-team-b transition-[width] duration-500" style={{ width: `${r}%` }} />
      </div>
    </div>
  );
}

/** Mirrored comparison bar for a single stat (e.g. ACS, rating), diverging from the center. */
export function CompareBar({
  label,
  aValue,
  bValue,
  format,
}: {
  label: string;
  aValue: number | null;
  bValue: number | null;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => v.toFixed(2));
  if (aValue == null || bValue == null) {
    return (
      <div className="flex items-center gap-3 py-1.5 text-sm">
        <span className="w-24 shrink-0 text-text-dim">{label}</span>
        <span className="text-text-faint text-xs">Datos no disponibles</span>
      </div>
    );
  }
  const max = Math.max(aValue, bValue, 0.0001);
  const aW = (aValue / max) * 50;
  const bW = (bValue / max) * 50;
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="w-16 shrink-0 font-data text-right text-text">{fmt(aValue)}</span>
      <div className="flex flex-1 h-1.5">
        <div className="flex flex-1 justify-end">
          <div className="h-full rounded-l bg-team-a" style={{ width: `${aW}%` }} />
        </div>
        <div className="w-px bg-border-soft" />
        <div className="flex flex-1 justify-start">
          <div className="h-full rounded-r bg-team-b" style={{ width: `${bW}%` }} />
        </div>
      </div>
      <span className="w-16 shrink-0 font-data text-text">{fmt(bValue)}</span>
      <span className="w-28 shrink-0 text-xs text-text-faint uppercase tracking-wide">{label}</span>
    </div>
  );
}
