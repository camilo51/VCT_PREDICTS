import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { DuelBar } from "./DuelBar";
import { ConfidenceMeter, StatusBadge, MapPoolBadge } from "./Badges";
import { Countdown } from "./Countdown";
import { formatMatchDateLabel } from "@/lib/format";
import { RegionBadge, RegionStripe } from "./RegionBadge";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used via `typeof` below
const matchCardArgs = {
  include: {
    event: true,
    stage: true,
    team1: true,
    team2: true,
    maps: { orderBy: { orderIndex: "asc" as const } },
    predictions: { where: { isActive: true }, orderBy: { createdAt: "desc" as const } },
  },
};
export type MatchCardData = Prisma.MatchGetPayload<typeof matchCardArgs>;

function TeamLogo({ name, url }: { name: string; url: string | null }) {
  if (!url) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded bg-bg-elevated-2 text-[10px] font-display text-text-dim">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="relative h-9 w-9 shrink-0">
      <Image src={url} alt={name} fill sizes="36px" className="object-contain" unoptimized />
    </div>
  );
}

export function MatchCard({ match }: { match: MatchCardData }) {
  const prediction = match.predictions[0];
  const t1 = match.team1;
  const t2 = match.team2;
  const stageLabel = match.stage?.name ?? match.seriesTitle ?? "";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group relative block overflow-hidden rounded-lg border border-border bg-bg-elevated p-4 pl-5 transition-colors hover:border-team-a/50 hover:bg-bg-elevated-2"
    >
      <RegionStripe region={match.event.region} />
      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-text-faint">
        <div className="flex min-w-0 items-center gap-2">
          <RegionBadge region={match.event.region} />
          <span className="truncate text-text-faint">
            {match.event.name}
            {stageLabel ? ` · ${stageLabel}` : ""}
          </span>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamLogo name={t1?.name ?? "TBD"} url={t1?.logoUrl ?? null} />
          <span className="line-clamp-2 font-display text-sm leading-tight tracking-wide text-text sm:text-base">{t1?.name ?? "Por definir"}</span>
        </div>
        <span className="shrink-0 px-1 pt-1.5 font-display text-xs text-text-faint">
          {match.status === "FINAL" ? `${match.team1Score ?? 0}–${match.team2Score ?? 0}` : "VS"}
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right">
          <span className="line-clamp-2 font-display text-sm leading-tight tracking-wide text-text sm:text-base">{t2?.name ?? "Por definir"}</span>
          <TeamLogo name={t2?.name ?? "TBD"} url={t2?.logoUrl ?? null} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-dim">
        <span>{match.scheduledAt ? formatMatchDateLabel(new Date(match.scheduledAt)) : "Horario por confirmar"}</span>
        <span className="font-data">{match.format ?? ""}</span>
      </div>

      {match.status === "UPCOMING" && match.scheduledAt && (
        <div className="mt-1 text-xs text-text-faint">
          Comienza en <Countdown target={match.scheduledAt} />
        </div>
      )}

      <div className="mt-3">
        {prediction ? (
          <DuelBar
            leftLabel={t1?.name ?? "?"}
            rightLabel={t2?.name ?? "?"}
            leftPct={prediction.team1WinProb}
            rightPct={prediction.team2WinProb}
          />
        ) : (
          <p className="text-xs text-text-faint">Predicción no disponible todavía.</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {prediction ? <ConfidenceMeter score={prediction.confidence} /> : <span />}
        <MapPoolBadge announced={match.mapsAnnounced} />
      </div>

      <div className="mt-3 text-right text-xs font-medium text-team-b opacity-0 transition-opacity group-hover:opacity-100">
        Ver análisis →
      </div>
    </Link>
  );
}
