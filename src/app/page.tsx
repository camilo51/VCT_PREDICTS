import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { listMatches } from "@/server/data/matches";
import { MatchCard } from "@/components/MatchCard";
import { DuelBar } from "@/components/DuelBar";
import { ConfidenceMeter, MapPoolBadge } from "@/components/Badges";
import { RegionBadge } from "@/components/RegionBadge";
import { Countdown } from "@/components/Countdown";
import { formatMatchDateLabel, formatRelativeTime } from "@/lib/format";
import { REGION_LABEL, REGION_COLOR } from "@/lib/region";
import type { Region } from "@prisma/client";
import { proxiedLogo } from "@/lib/image";

export const dynamic = "force-dynamic";

const REGIONS: Region[] = ["AMERICAS", "EMEA", "PACIFIC", "CHINA", "INTERNATIONAL"];

export default async function DashboardPage() {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const in7d = new Date(now);
  in7d.setDate(in7d.getDate() + 7);

  const [liveMatches, upcomingSoon, todayCount, next7dCount, activePredictions, lastSync] = await Promise.all([
    listMatches({ status: ["LIVE"], limit: 3 }),
    listMatches({ status: ["UPCOMING"], limit: 200 }),
    prisma.match.count({ where: { status: "UPCOMING", scheduledAt: { gte: now, lte: todayEnd } } }),
    prisma.match.count({ where: { status: "UPCOMING", scheduledAt: { gte: now, lte: in7d } } }),
    prisma.predictionSnapshot.count({ where: { isActive: true, kind: "PRE_MATCH" } }),
    prisma.syncLog.findFirst({ where: { ok: true }, orderBy: { startedAt: "desc" } }),
  ]);

  const featured = upcomingSoon.find((m) => m.predictions.length > 0) ?? upcomingSoon[0];
  const byRegion = new Map<Region, typeof upcomingSoon>();
  for (const m of upcomingSoon) {
    if (featured && m.id === featured.id) continue;
    const list = byRegion.get(m.event.region) ?? [];
    if (list.length < 3) list.push(m);
    byRegion.set(m.event.region, list);
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-text sm:text-3xl">VCT Predicts</h1>
          <p className="mt-1 text-sm text-text-dim">Seguimiento automático del Valorant Champions Tour · predicción generada por el motor propio.</p>
        </div>
        {lastSync && <p className="text-xs text-text-faint">Última sincronización: {formatRelativeTime(lastSync.startedAt)}</p>}
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Partidos hoy" value={todayCount} />
        <StatTile label="Próximos 7 días" value={next7dCount} />
        <StatTile label="Predicciones activas" value={activePredictions} />
        <StatTile label="En vivo ahora" value={liveMatches.length} accent={liveMatches.length > 0} />
      </div>

      {liveMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg tracking-wide text-team-a">
            <span className="h-2 w-2 rounded-full bg-team-a animate-live-pulse" /> En vivo ahora
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {featured && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg tracking-wide">Próximo destacado</h2>
          <FeaturedMatch match={featured} />
        </section>
      )}

      {REGIONS.map((region) => {
        const matches = byRegion.get(region);
        if (!matches || matches.length === 0) return null;
        return (
          <section key={region} className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RegionBadge region={region} showLabel={false} />
                <h2 className="font-display text-lg tracking-wide">{REGION_LABEL[region]}</h2>
              </div>
              <Link href={`/matches?region=${region}`} className="text-xs text-team-b hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        );
      })}

      {upcomingSoon.length === 0 && liveMatches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-text-faint">
          No hay próximos partidos de VCT todavía.
          <br />
          La plataforma se actualizará automáticamente en cuanto la fuente publique nuevos partidos.
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4">
      <div className="text-xs text-text-faint">{label}</div>
      <div className={`mt-1 font-display text-2xl ${accent ? "text-team-a" : "text-text"}`}>{value}</div>
    </div>
  );
}

function FeaturedMatch({ match }: { match: Awaited<ReturnType<typeof listMatches>>[number] }) {
  const t1 = match.team1;
  const t2 = match.team2;
  const prediction = match.predictions[0];
  const color = REGION_COLOR[match.event.region];

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group relative block overflow-hidden rounded-xl border p-6 transition-colors"
      style={{ borderColor: "var(--border)", background: `linear-gradient(135deg, color-mix(in srgb, ${color} 8%, var(--bg-elevated)), var(--bg-elevated))` }}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
        <div className="flex items-center gap-2">
          <RegionBadge region={match.event.region} />
          <span className="text-text-faint">{match.event.name}{match.stage ? ` · ${match.stage.name}` : ""}</span>
        </div>
        {match.scheduledAt && (
          <span className="text-text-faint">
            {formatMatchDateLabel(new Date(match.scheduledAt))} · Comienza en <Countdown target={match.scheduledAt} />
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          {t1?.logoUrl && <Image src={proxiedLogo(t1.logoUrl)!} alt="" width={40} height={40} unoptimized className="object-contain" />}
          <span className="font-display text-xl tracking-wide sm:text-2xl">{t1?.name ?? "Por definir"}</span>
        </div>
        <span className="font-display text-sm text-text-faint">{match.format}</span>
        <div className="flex items-center justify-end gap-3 text-right">
          <span className="font-display text-xl tracking-wide sm:text-2xl">{t2?.name ?? "Por definir"}</span>
          {t2?.logoUrl && <Image src={proxiedLogo(t2.logoUrl)!} alt="" width={40} height={40} unoptimized className="object-contain" />}
        </div>
      </div>

      <div className="mt-5">
        {prediction ? (
          <DuelBar leftLabel={t1?.name} rightLabel={t2?.name} leftPct={prediction.team1WinProb} rightPct={prediction.team2WinProb} size="lg" />
        ) : (
          <p className="text-sm text-text-faint">Predicción no disponible todavía.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        {prediction ? <ConfidenceMeter score={prediction.confidence} /> : <span />}
        <MapPoolBadge announced={match.mapsAnnounced} />
      </div>

      <div className="mt-4 text-right text-sm font-medium text-team-b opacity-0 transition-opacity group-hover:opacity-100">Ver análisis completo →</div>
    </Link>
  );
}
