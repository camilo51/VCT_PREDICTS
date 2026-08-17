import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTeamAggregateStats, getRecentForm, getMapPoolTendency } from "@/server/prediction/features";
import { getAgentComposition, getTeamRankingInRegion } from "@/server/data/insights";
import { SectionCard } from "@/components/SectionCard";
import { MatchCard } from "@/components/MatchCard";
import { REGION_LABEL } from "@/lib/region";
import { pct, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id }, include: { players: true } });
  if (!team) notFound();

  const [stats, form, mapPool, agents, ranking, upcoming, results] = await Promise.all([
    getTeamAggregateStats(id),
    getRecentForm(id, undefined, 10),
    getMapPoolTendency(id),
    getAgentComposition(id),
    team.region ? getTeamRankingInRegion(id, team.region) : Promise.resolve({ rank: null, of: 0 }),
    prisma.match.findMany({
      where: { status: "UPCOMING", OR: [{ team1Id: id }, { team2Id: id }] },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: {
        event: true,
        stage: true,
        team1: true,
        team2: true,
        maps: { orderBy: { orderIndex: "asc" } },
        predictions: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.match.findMany({
      where: { status: "FINAL", OR: [{ team1Id: id }, { team2Id: id }] },
      orderBy: { scheduledAt: "desc" },
      take: 8,
      include: { event: true, team1: true, team2: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <Link href="/teams" className="mb-4 inline-block text-xs text-text-faint hover:text-text-dim">← Todos los equipos</Link>

      <header className="flex items-center gap-4 rounded-lg border border-border bg-bg-elevated p-6">
        {team.logoUrl ? (
          <div className="relative h-16 w-16 shrink-0">
            <Image src={team.logoUrl} alt={team.name} fill sizes="64px" className="object-contain" unoptimized />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-bg-elevated-2 font-display text-xl text-text-dim">
            {team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl tracking-wide sm:text-3xl">{team.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-dim">
            <span>{team.region ? REGION_LABEL[team.region] : "Región desconocida"}</span>
            {ranking.rank && <span>#{ranking.rank} de {ranking.of} en la región (rating interno VCT Predicts)</span>}
          </div>
        </div>
      </header>

      <SectionCard title="Estadísticas" className="mt-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Win rate series" value={pct(stats.seriesWinRate)} />
          <Stat label="Map win rate" value={pct(stats.mapWinRate)} />
          <Stat label="Rating" value={num(stats.avgRating)} />
          <Stat label="ACS" value={stats.avgAcs != null ? stats.avgAcs.toFixed(0) : "Sin datos"} />
          <Stat label="ADR" value={stats.avgAdr != null ? stats.avgAdr.toFixed(0) : "Sin datos"} />
          <Stat label="KAST" value={stats.avgKast != null ? `${stats.avgKast.toFixed(0)}%` : "Sin datos"} />
          <Stat label="K/D" value={num(stats.kd)} />
          <Stat label="Attack / Defense" value={`${pct(stats.atkWinRate)} / ${pct(stats.defWinRate)}`} />
        </div>
      </SectionCard>

      <SectionCard title="Forma reciente (últimos 10)" className="mt-4">
        <div className="flex gap-1.5">
          {form.last5.map((r, i) => (
            <span key={i} className={`flex h-7 w-7 items-center justify-center rounded font-display text-xs ${r === "W" ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>{r}</span>
          ))}
          {form.last5.length === 0 && <span className="text-sm text-text-faint">Sin partidos recientes registrados</span>}
        </div>
        <div className="mt-3 text-sm text-text-dim">{form.wins}V - {form.losses}D de {form.matchesFound} partidos encontrados</div>
      </SectionCard>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Roster">
          <ul className="space-y-2">
            {team.players.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-bg-elevated-2">
                  <span className="font-display tracking-wide">{p.handle}</span>
                  <span className="text-xs text-text-faint">{p.country?.toUpperCase() ?? ""}</span>
                </Link>
              </li>
            ))}
            {team.players.length === 0 && <p className="text-sm text-text-faint">Sin roster registrado.</p>}
          </ul>
        </SectionCard>

        <SectionCard title="Map pool">
          <div className="space-y-2">
            {mapPool.slice(0, 7).map((m) => (
              <div key={m.mapName} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-text">{m.mapName}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated-2">
                  <div className="h-full bg-team-a" style={{ width: `${(m.winRate ?? 0) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-text-faint">{m.played} jugados · {pct(m.winRate)}</span>
              </div>
            ))}
            {mapPool.length === 0 && <p className="text-sm text-text-faint">Sin historial de mapas registrado.</p>}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Agentes" className="mt-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {agents.slice(0, 8).map((a) => (
            <div key={a.agentName} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate">{a.agentName}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated-2">
                <div className="h-full bg-team-b" style={{ width: `${a.pickRate * 100}%` }} />
              </div>
              <span className="w-14 shrink-0 text-right font-data text-xs text-text-faint">{Math.round(a.pickRate * 100)}%</span>
            </div>
          ))}
          {agents.length === 0 && <p className="text-sm text-text-faint">Sin datos de composiciones todavía.</p>}
        </div>
      </SectionCard>

      {upcoming.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-3 font-display text-lg tracking-wide">Próximos partidos</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <SectionCard title="Resultados recientes" className="mt-4">
          <ul className="divide-y divide-border-soft text-sm">
            {results.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <Link href={`/matches/${m.id}`} className="hover:text-team-a">
                  {m.team1?.name} vs {m.team2?.name}
                </Link>
                <span className="font-data text-text-dim">{m.team1Score}-{m.team2Score}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-faint">{label}</div>
      <div className="font-data text-lg text-text">{value}</div>
    </div>
  );
}
