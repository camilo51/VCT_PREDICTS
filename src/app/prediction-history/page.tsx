import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RegionBadge } from "@/components/RegionBadge";
import { Pagination, parsePage } from "@/components/Pagination";
import { REGION_LABEL } from "@/lib/region";
import { pct } from "@/lib/format";
import type { Region } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

function isSweep(score: string | null): boolean | null {
  if (!score) return null;
  return score.endsWith("-0");
}

export default async function PredictionHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = parsePage(sp);

  const [evaluations, totalCount] = await Promise.all([
    prisma.matchEvaluation.findMany({
      include: { match: { include: { event: true, team1: true, team2: true } } },
      orderBy: { evaluatedAt: "desc" },
    }),
    prisma.matchEvaluation.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paged = evaluations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = evaluations.length;
  const winnerCorrect = evaluations.filter((e) => e.winnerCorrect).length;
  const scoreCorrect = evaluations.filter((e) => e.scoreCorrect).length;
  const mapsCorrect = evaluations.reduce((s, e) => s + (e.mapsCorrect ?? 0), 0);
  const mapsTotal = evaluations.reduce((s, e) => s + (e.mapsTotal ?? 0), 0);
  const bucketMatches = evaluations.filter((e) => isSweep(e.predictedScore) === isSweep(e.actualScore)).length;

  const byRegion = new Map<Region, { total: number; correct: number }>();
  for (const e of evaluations) {
    const r = e.match.event.region;
    const s = byRegion.get(r) ?? { total: 0, correct: 0 };
    s.total++;
    if (e.winnerCorrect) s.correct++;
    byRegion.set(r, s);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Historial de predicciones</h1>
      <p className="mt-1 text-sm text-text-dim">Rendimiento real del modelo: predicción previa comparada contra el resultado final de cada partido.</p>
      {total > 0 && (
        <p className="mt-1 text-xs text-text-faint">
          {total - evaluations.filter((e) => e.isBackfill).length} en tiempo real · {evaluations.filter((e) => e.isBackfill).length} reconstruidas (sync inactivo antes del partido)
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Accuracy (ganador)" value={total ? pct(winnerCorrect / total) : "Sin datos"} />
        <StatCard label="Series score accuracy" value={total ? pct(scoreCorrect / total) : "Sin datos"} />
        <StatCard label="Map prediction accuracy" value={mapsTotal ? pct(mapsCorrect / mapsTotal) : "Sin datos"} />
        <StatCard label="2-0 / 2-1 accuracy" value={total ? pct(bucketMatches / total) : "Sin datos"} />
      </div>

      {byRegion.size > 0 && (
        <div className="mt-5 rounded-lg border border-border-soft bg-bg-elevated/50 p-4">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-text-faint">Accuracy por región</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {[...byRegion.entries()].map(([region, s]) => (
              <span key={region} className="text-text-dim">
                {REGION_LABEL[region]}: <span className="font-data text-text">{pct(s.correct / s.total)}</span> <span className="text-text-faint">({s.total})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {paged.map((e) => (
          <Link key={e.id} href={`/matches/${e.matchId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm transition-colors hover:border-team-a/50">
            <span>{e.match.team1?.name} vs {e.match.team2?.name}</span>
            <span className="flex items-center gap-1.5 text-xs">
              <RegionBadge region={e.match.event.region} showLabel={false} />
              <span className="text-text-faint">{e.match.event.name}</span>
            </span>
            <span className="font-data text-text-dim">{e.actualScore}</span>
            <span className={e.winnerCorrect ? "text-good" : "text-bad"}>{e.winnerCorrect ? "✓ Acertó ganador" : "✗ Falló ganador"}</span>
            {e.mapsTotal ? <span className="text-xs text-text-faint">Mapas: {e.mapsCorrect}/{e.mapsTotal}</span> : null}
            {e.isBackfill && <span className="rounded-sm bg-warn/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-warn">Reconstruida</span>}
          </Link>
        ))}
        {evaluations.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-text-faint">
            Todavía no hay partidos finalizados con predicción previa para evaluar.
          </div>
        )}
      </div>

      <Pagination base="/prediction-history" current={sp} page={page} totalPages={totalPages} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs text-text-faint">{label}</div>
      <div className="mt-1 font-display text-2xl text-team-b">{value}</div>
    </div>
  );
}
