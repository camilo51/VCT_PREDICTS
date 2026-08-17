import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPlayerAggregate } from "@/server/data/insights";
import { SectionCard } from "@/components/SectionCard";
import { roleForAgent } from "@/reference/agentRoles";
import { REGION_LABEL } from "@/lib/region";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await prisma.player.findUnique({ where: { id }, include: { currentTeam: true } });
  if (!player) notFound();

  const [aggregate, recentMaps] = await Promise.all([
    getPlayerAggregate(id, player.handle, 20),
    prisma.mapPlayerStat.findMany({
      where: { playerId: id },
      orderBy: { id: "desc" },
      take: 15,
      include: {
        map: {
          include: {
            match: { include: { team1: true, team2: true, event: true } },
          },
        },
      },
    }),
  ]);

  const primaryAgent = aggregate.topAgents[0]?.name;
  const role = roleForAgent(primaryAgent);

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
      <Link href="/players" className="mb-4 inline-block text-xs text-text-faint hover:text-text-dim">← Todos los jugadores</Link>

      <header className="rounded-lg border border-border bg-bg-elevated p-6">
        <h1 className="font-display text-2xl tracking-wide sm:text-3xl">{player.handle}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-dim">
          {player.currentTeam && (
            <Link href={`/teams/${player.currentTeam.id}`} className="hover:text-team-a">{player.currentTeam.name}</Link>
          )}
          {player.currentTeam?.region && <span>{REGION_LABEL[player.currentTeam.region]}</span>}
          {role && <span className="rounded-sm bg-bg-elevated-2 px-2 py-0.5 text-xs uppercase tracking-wide">{role}</span>}
          {player.country && <span>{player.country.toUpperCase()}</span>}
        </div>
      </header>

      <SectionCard title="Estadísticas generales" className="mt-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Rating" value={aggregate.avgRating?.toFixed(2) ?? "Sin datos"} />
          <Stat label="ACS" value={aggregate.avgAcs?.toFixed(0) ?? "Sin datos"} />
          <Stat label="ADR" value={aggregate.avgAdr?.toFixed(0) ?? "Sin datos"} />
          <Stat label="KAST" value={aggregate.avgKast != null ? `${aggregate.avgKast.toFixed(0)}%` : "Sin datos"} />
          <Stat label="K/D" value={aggregate.kd?.toFixed(2) ?? "Sin datos"} />
          <Stat label="HS%" value={aggregate.avgHs != null ? `${aggregate.avgHs.toFixed(0)}%` : "Sin datos"} />
          <Stat label="First bloods / mapa" value={aggregate.avgFirstBloods?.toFixed(1) ?? "Sin datos"} />
          <Stat label="First deaths / mapa" value={aggregate.avgFirstDeaths?.toFixed(1) ?? "Sin datos"} />
        </div>
        <p className="mt-3 text-xs text-text-faint">Sobre los últimos {aggregate.mapsFound} mapas registrados.</p>
      </SectionCard>

      <SectionCard title="Agentes" className="mt-4">
        <div className="space-y-2">
          {aggregate.topAgents.map((a) => (
            <div key={a.name} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0">{a.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated-2">
                <div className="h-full bg-team-a" style={{ width: `${(a.count / aggregate.mapsFound) * 100}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right text-xs text-text-faint">{a.count} mapas</span>
            </div>
          ))}
          {aggregate.topAgents.length === 0 && <p className="text-sm text-text-faint">Sin datos de agentes todavía.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Últimos mapas" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-text-faint">
                <th className="pb-2 font-normal">Partido</th>
                <th className="pb-2 font-normal">Mapa</th>
                <th className="pb-2 font-normal text-right">Rating</th>
                <th className="pb-2 font-normal text-right">ACS</th>
                <th className="pb-2 font-normal text-right">K/D</th>
              </tr>
            </thead>
            <tbody className="font-data">
              {recentMaps.map((row) => {
                const m = row.map.match;
                const kd = row.deaths && row.deaths > 0 ? (row.kills ?? 0) / row.deaths : null;
                return (
                  <tr key={row.id} className="border-t border-border-soft">
                    <td className="py-1.5">
                      <Link href={`/matches/${m.id}`} className="hover:text-team-a">{m.team1?.name} vs {m.team2?.name}</Link>
                    </td>
                    <td className="py-1.5 text-text-dim">{row.map.mapName}</td>
                    <td className="py-1.5 text-right">{row.rating?.toFixed(2) ?? "—"}</td>
                    <td className="py-1.5 text-right">{row.acs ?? "—"}</td>
                    <td className="py-1.5 text-right">{kd?.toFixed(2) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {recentMaps.length === 0 && <p className="text-sm text-text-faint">Sin mapas registrados todavía.</p>}
        </div>
      </SectionCard>
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
