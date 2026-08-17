export function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Muy alta", color: "text-good" };
  if (score >= 75) return { label: "Alta", color: "text-team-b" };
  if (score >= 60) return { label: "Media", color: "text-warn" };
  if (score >= 50) return { label: "Baja", color: "text-warn" };
  return { label: "Muy baja", color: "text-bad" };
}

export function ConfidenceMeter({ score }: { score: number }) {
  const { label, color } = confidenceLabel(score);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-faint uppercase tracking-wide">Confianza</span>
      <div className="h-1.5 w-16 rounded-full bg-bg-elevated-2 overflow-hidden">
        <div
          className={`h-full ${score >= 75 ? "bg-good" : score >= 50 ? "bg-warn" : "bg-bad"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-data ${color}`}>
        {Math.round(score)}/100 · {label}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: "UPCOMING" | "LIVE" | "FINAL" }) {
  if (status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-team-a/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-team-a">
        <span className="h-1.5 w-1.5 rounded-full bg-team-a animate-live-pulse" />
        En vivo
      </span>
    );
  }
  if (status === "FINAL") {
    return (
      <span className="inline-flex items-center rounded-sm bg-bg-elevated-2 px-2 py-0.5 text-[11px] uppercase tracking-wide text-text-dim">
        Finalizado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-sm bg-team-b/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-team-b">
      Próximo
    </span>
  );
}

export function MapPoolBadge({ announced }: { announced: boolean }) {
  return announced ? (
    <span className="inline-flex items-center rounded-sm bg-good/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-good">
      Mapas confirmados
    </span>
  ) : (
    <span className="inline-flex items-center rounded-sm bg-bg-elevated-2 px-2 py-0.5 text-[11px] uppercase tracking-wide text-text-faint">
      Mapas pendientes
    </span>
  );
}
