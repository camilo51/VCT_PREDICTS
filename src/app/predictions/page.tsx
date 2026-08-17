import Link from "next/link";
import Image from "next/image";
import { listMatches, countMatches } from "@/server/data/matches";
import { DuelBar } from "@/components/DuelBar";
import { ConfidenceMeter, MapPoolBadge } from "@/components/Badges";
import { RegionFilterGroup } from "@/components/FilterBar";
import { RegionBadge } from "@/components/RegionBadge";
import { Pagination, parsePage } from "@/components/Pagination";
import { formatMatchDateLabel, formatRelativeTime } from "@/lib/format";
import type { Region } from "@prisma/client";
import { proxiedLogo } from "@/lib/image";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function PredictionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const region = (sp.region as Region | undefined) || undefined;
  const page = parsePage(sp);
  const filters = { status: ["UPCOMING", "LIVE"] as ("UPCOMING" | "LIVE")[], region, hasPrediction: true };

  const [matches, total] = await Promise.all([
    listMatches({ ...filters, page, pageSize: PAGE_SIZE }),
    countMatches(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Predicciones</h1>
      <p className="mt-1 text-sm text-text-dim">{total} predicciones activas para próximos partidos de VCT, ordenadas por fecha.</p>

      <div className="my-5">
        <RegionFilterGroup base="/predictions" current={sp} />
      </div>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-text-faint">
          Todavía no hay predicciones generadas para los próximos partidos.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const p = m.predictions[0];
            const topScore = Object.entries(p.seriesScoreProbsJson as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
            const winner = p.team1WinProb >= p.team2WinProb ? m.team1 : m.team2;
            return (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="block rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-team-a/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide">
                  <div className="flex items-center gap-2">
                    <RegionBadge region={m.event.region} />
                    <span className="text-text-faint">{m.event.name}</span>
                  </div>
                  <span className="text-text-faint">{m.scheduledAt ? formatMatchDateLabel(new Date(m.scheduledAt)) : "Por confirmar"}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 font-display text-lg">
                  {m.team1?.logoUrl && <Image src={proxiedLogo(m.team1.logoUrl)!} alt="" width={22} height={22} unoptimized className="object-contain" />}
                  <span>{m.team1?.name ?? "TBD"}</span>
                  <span className="text-text-faint text-sm">vs</span>
                  <span>{m.team2?.name ?? "TBD"}</span>
                  {m.team2?.logoUrl && <Image src={proxiedLogo(m.team2.logoUrl)!} alt="" width={22} height={22} unoptimized className="object-contain" />}
                </div>
                <div className="mt-3">
                  <DuelBar leftLabel={m.team1?.name} rightLabel={m.team2?.name} leftPct={p.team1WinProb} rightPct={p.team2WinProb} size="sm" />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-text-dim">
                    Ganador estimado: <span className="font-display text-text">{winner?.name ?? "—"}</span>
                    {topScore && <span className="ml-2 font-data text-text-faint">({topScore[0]})</span>}
                  </span>
                  <ConfidenceMeter score={p.confidence} />
                  <MapPoolBadge announced={m.mapsAnnounced} />
                  <span className="text-xs text-text-faint">Actualizado {formatRelativeTime(p.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination base="/predictions" current={sp} page={page} totalPages={totalPages} />
    </div>
  );
}
