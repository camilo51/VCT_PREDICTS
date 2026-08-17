import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listPlayerLeaderboard } from "@/server/data/insights";
import { RegionFilterGroup } from "@/components/FilterBar";
import { FilterSelect } from "@/components/FilterSelect";
import { REGION_LABEL } from "@/lib/region";
import type { Region } from "@prisma/client";

export const dynamic = "force-dynamic";

const PERIOD_OPTIONS = [
  { label: "Actual", value: "" },
  { label: "Últimos 30 días", value: "30d" },
  { label: "Últimos 3 meses", value: "3m" },
];

const STAT_OPTIONS = [
  { label: "Rating", value: "rating" },
  { label: "ACS", value: "acs" },
  { label: "K/D", value: "kd" },
  { label: "ADR", value: "adr" },
];

function sinceFor(period: string | undefined) {
  if (period === "30d") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (period === "3m") {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  return undefined;
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const region = (sp.region as Region | undefined) || undefined;
  const stat = sp.stat ?? "rating";
  const since = sinceFor(sp.period);

  const [ratings, teams, players] = await Promise.all([
    prisma.teamRating.findMany({ where: region ? { region } : undefined, orderBy: { asOf: "desc" }, distinct: ["teamId"] }),
    prisma.team.findMany(),
    listPlayerLeaderboard(since),
  ]);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamRanking = ratings
    .map((r) => ({ ...r, team: teamById.get(r.teamId) }))
    .filter((r) => r.team)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 20);

  const filteredPlayers = region ? players.filter((p) => p.region === region) : players;
  const statKey = stat === "acs" ? "avgAcs" : stat === "kd" ? "kd" : stat === "adr" ? "avgAdr" : "avgRating";
  const playerRanking = [...filteredPlayers].sort((a, b) => (b[statKey] ?? -Infinity) - (a[statKey] ?? -Infinity)).slice(0, 20);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Rankings</h1>
      <p className="mt-1 text-sm text-text-dim">Rating interno del motor VCT Predicts — no es un ranking oficial de Riot/VCT.</p>

      <div className="my-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <RegionFilterGroup base="/rankings" current={sp} />
        <FilterSelect current={sp} paramKey="period" options={PERIOD_OPTIONS} label="Periodo (jugadores)" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-display text-lg tracking-wide">Equipos {region ? `— ${REGION_LABEL[region]}` : "— Global"}</h2>
          <ol className="divide-y divide-border-soft rounded-lg border border-border">
            {teamRanking.map((r, i) => (
              <li key={r.teamId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link href={`/teams/${r.teamId}`} className="hover:text-team-a">
                  <span className="text-text-faint mr-2 font-data">{i + 1}</span>
                  {r.team!.name}
                </Link>
                <span className="font-data text-team-b">{Math.round(r.rating)}</span>
              </li>
            ))}
            {teamRanking.length === 0 && <li className="px-4 py-6 text-center text-text-faint">Sin datos suficientes todavía.</li>}
          </ol>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg tracking-wide">Jugadores</h2>
            <FilterSelect current={sp} paramKey="stat" options={STAT_OPTIONS} label="Métrica" />
          </div>
          <ol className="divide-y divide-border-soft rounded-lg border border-border">
            {playerRanking.map((p, i) => (
              <li key={p.playerId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link href={`/players/${p.playerId}`} className="hover:text-team-a">
                  <span className="text-text-faint mr-2 font-data">{i + 1}</span>
                  {p.handle} <span className="text-text-faint text-xs">{p.teamName}</span>
                </Link>
                <span className="font-data text-team-b">{(p[statKey] ?? 0).toFixed(stat === "acs" || stat === "adr" ? 0 : 2)}</span>
              </li>
            ))}
            {playerRanking.length === 0 && <li className="px-4 py-6 text-center text-text-faint">Sin datos suficientes todavía.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}
