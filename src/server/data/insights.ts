import { prisma } from "@/lib/prisma";
import { roleForAgent, type AgentRole } from "@/reference/agentRoles";
import { predictMatch } from "@/server/prediction/engine";

export interface PlayerAggregate {
  playerId: string;
  handle: string;
  mapsFound: number;
  avgRating: number | null;
  avgAcs: number | null;
  avgAdr: number | null;
  avgKast: number | null;
  kd: number | null;
  avgFirstBloods: number | null;
  avgFirstDeaths: number | null;
  avgHs: number | null;
  topAgents: Array<{ name: string; count: number }>;
}

export async function getPlayerAggregate(playerId: string, handle: string, limit = 20): Promise<PlayerAggregate> {
  const rows = await prisma.mapPlayerStat.findMany({
    where: { playerId },
    orderBy: { id: "desc" },
    take: limit,
  });

  if (rows.length === 0) {
    return {
      playerId,
      handle,
      mapsFound: 0,
      avgRating: null,
      avgAcs: null,
      avgAdr: null,
      avgKast: null,
      kd: null,
      avgFirstBloods: null,
      avgFirstDeaths: null,
      avgHs: null,
      topAgents: [],
    };
  }

  const avg = (vals: Array<number | null>) => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const totalKills = rows.reduce((s, r) => s + (r.kills ?? 0), 0);
  const totalDeaths = rows.reduce((s, r) => s + (r.deaths ?? 0), 0);

  const agentCounts = new Map<string, number>();
  for (const r of rows) {
    const agents = Array.isArray(r.agentsJson) ? (r.agentsJson as string[]) : [];
    for (const a of agents) agentCounts.set(a, (agentCounts.get(a) ?? 0) + 1);
  }
  const topAgents = [...agentCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    playerId,
    handle,
    mapsFound: rows.length,
    avgRating: avg(rows.map((r) => r.rating)),
    avgAcs: avg(rows.map((r) => r.acs)),
    avgAdr: avg(rows.map((r) => r.adr)),
    avgKast: avg(rows.map((r) => r.kast)),
    kd: totalDeaths > 0 ? totalKills / totalDeaths : null,
    avgFirstBloods: avg(rows.map((r) => r.firstBloods)),
    avgFirstDeaths: avg(rows.map((r) => r.firstDeaths)),
    avgHs: avg(rows.map((r) => r.hs)),
    topAgents,
  };
}

export interface PlayerToWatch {
  playerId: string;
  handle: string;
  teamName: string;
  reasons: string[];
  aggregate: PlayerAggregate;
}

export async function pickPlayerToWatch(
  team1: { id: string; name: string; players: Array<{ id: string; handle: string }> },
  team2: { id: string; name: string; players: Array<{ id: string; handle: string }> },
): Promise<PlayerToWatch | null> {
  const all = [
    ...team1.players.map((p) => ({ ...p, teamName: team1.name })),
    ...team2.players.map((p) => ({ ...p, teamName: team2.name })),
  ];
  if (all.length === 0) return null;

  const aggregates = await Promise.all(all.map((p) => getPlayerAggregate(p.id, p.handle, 15)));

  let best: { idx: number; score: number } | null = null;
  aggregates.forEach((agg, idx) => {
    if (agg.mapsFound === 0 || agg.avgRating == null) return;
    const fkfd = (agg.avgFirstBloods ?? 0) - (agg.avgFirstDeaths ?? 0);
    const score = agg.avgRating * 1.0 + fkfd * 0.12 + Math.min(agg.mapsFound / 15, 1) * 0.1;
    if (!best || score > best.score) best = { idx, score };
  });
  if (!best) return null;

  const b = best as { idx: number; score: number };
  const chosen = all[b.idx];
  const agg = aggregates[b.idx];

  const reasons: string[] = [];
  if (agg.avgRating != null) reasons.push(`Rating promedio reciente de ${agg.avgRating.toFixed(2)} en sus últimos ${agg.mapsFound} mapas.`);
  if (agg.avgFirstBloods != null && agg.avgFirstDeaths != null) {
    reasons.push(`Impacto en primeras bajas: ${agg.avgFirstBloods.toFixed(1)} first bloods vs ${agg.avgFirstDeaths.toFixed(1)} first deaths por mapa.`);
  }
  if (agg.topAgents.length > 0) reasons.push(`Agente principal: ${agg.topAgents[0].name} (${agg.topAgents[0].count} mapas recientes).`);

  return { playerId: chosen.id, handle: chosen.handle, teamName: chosen.teamName, reasons, aggregate: agg };
}

export interface RoleMatchup {
  role: AgentRole;
  playerA: { id: string; handle: string; aggregate: PlayerAggregate } | null;
  playerB: { id: string; handle: string; aggregate: PlayerAggregate } | null;
}

export async function buildKeyMatchups(
  team1Players: Array<{ id: string; handle: string }>,
  team2Players: Array<{ id: string; handle: string }>,
): Promise<RoleMatchup[]> {
  const roles: AgentRole[] = ["Duelist", "Controller", "Initiator", "Sentinel"];

  async function byRole(players: Array<{ id: string; handle: string }>) {
    const aggs = await Promise.all(players.map((p) => getPlayerAggregate(p.id, p.handle, 15)));
    const map = new Map<AgentRole, { id: string; handle: string; aggregate: PlayerAggregate }>();
    aggs.forEach((agg, idx) => {
      const primaryAgent = agg.topAgents[0]?.name;
      const role = roleForAgent(primaryAgent);
      if (!role) return;
      const existing = map.get(role);
      if (!existing || (agg.avgRating ?? 0) > (existing.aggregate.avgRating ?? 0)) {
        map.set(role, { id: players[idx].id, handle: players[idx].handle, aggregate: agg });
      }
    });
    return map;
  }

  const [mapA, mapB] = await Promise.all([byRole(team1Players), byRole(team2Players)]);

  return roles.map((role) => ({ role, playerA: mapA.get(role) ?? null, playerB: mapB.get(role) ?? null }));
}

export interface AgentCompStat {
  agentName: string;
  played: number;
  wins: number;
  winRate: number | null;
  pickRate: number;
}

export async function getAgentComposition(teamId: string, limit = 40): Promise<AgentCompStat[]> {
  const stats = await prisma.mapPlayerStat.findMany({
    where: { teamId },
    orderBy: { id: "desc" },
    take: limit * 5,
    select: { agentsJson: true, mapPlayedId: true, map: { select: { winnerTeamId: true } } },
  });

  const byMapAgent = new Map<string, Set<string>>();
  const totalMaps = new Set<string>();
  const mapWinner = new Map<string, string | null>();

  for (const s of stats) {
    totalMaps.add(s.mapPlayedId);
    mapWinner.set(s.mapPlayedId, s.map.winnerTeamId);
    const agents = Array.isArray(s.agentsJson) ? (s.agentsJson as string[]) : [];
    for (const a of agents) {
      if (!byMapAgent.has(a)) byMapAgent.set(a, new Set());
      byMapAgent.get(a)!.add(s.mapPlayedId);
    }
  }

  const played = new Map<string, number>();
  const wins = new Map<string, number>();
  for (const [agent, mapIds] of byMapAgent.entries()) {
    played.set(agent, mapIds.size);
    let w = 0;
    for (const mid of mapIds) if (mapWinner.get(mid) === teamId) w++;
    wins.set(agent, w);
  }

  const totalMapCount = totalMaps.size;
  return [...played.entries()]
    .map(([agentName, count]) => ({
      agentName,
      played: count,
      wins: wins.get(agentName) ?? 0,
      winRate: count > 0 ? (wins.get(agentName) ?? 0) / count : null,
      pickRate: totalMapCount > 0 ? count / totalMapCount : 0,
    }))
    .sort((a, b) => b.played - a.played);
}

export interface PlayerLeaderboardRow {
  playerId: string;
  handle: string;
  teamId: string | null;
  teamName: string | null;
  country: string | null;
  region: string | null;
  mapsPlayed: number;
  avgRating: number | null;
  avgAcs: number | null;
  avgAdr: number | null;
  kd: number | null;
}

/** Bulk aggregate stats for every player with recorded map data — backs the players list/rankings pages. */
export async function listPlayerLeaderboard(since?: Date): Promise<PlayerLeaderboardRow[]> {
  const grouped = await prisma.mapPlayerStat.groupBy({
    by: ["playerId"],
    where: since ? { map: { match: { scheduledAt: { gte: since } } } } : undefined,
    _avg: { rating: true, acs: true, adr: true },
    _sum: { kills: true, deaths: true },
    _count: { _all: true },
  });

  const players = await prisma.player.findMany({
    where: { id: { in: grouped.map((g) => g.playerId) } },
    include: { currentTeam: true },
  });
  const byId = new Map(players.map((p) => [p.id, p]));

  return grouped
    .map((g) => {
      const p = byId.get(g.playerId);
      return {
        playerId: g.playerId,
        handle: p?.handle ?? "?",
        teamId: p?.currentTeamId ?? null,
        teamName: p?.currentTeam?.name ?? null,
        country: p?.country ?? null,
        region: p?.currentTeam?.region ?? null,
        mapsPlayed: g._count._all,
        avgRating: g._avg.rating,
        avgAcs: g._avg.acs,
        avgAdr: g._avg.adr,
        kd: g._sum.deaths && g._sum.deaths > 0 ? (g._sum.kills ?? 0) / g._sum.deaths : null,
      };
    })
    .filter((r) => r.handle !== "?");
}

export async function getTeamRankingInRegion(teamId: string, region: string) {
  const ratings = await prisma.teamRating.findMany({
    where: { region: region as never },
    orderBy: { asOf: "desc" },
    distinct: ["teamId"],
    select: { teamId: true, rating: true },
  });
  const sorted = ratings.sort((a, b) => b.rating - a.rating);
  const idx = sorted.findIndex((r) => r.teamId === teamId);
  return { rank: idx >= 0 ? idx + 1 : null, of: sorted.length };
}

/** Grades a finished match's pre-match prediction against the real result. Idempotent. */
export async function evaluateFinishedMatches() {
  const matches = await prisma.match.findMany({
    where: { status: "FINAL", evaluation: null, team1Score: { not: null }, team2Score: { not: null } },
    include: { predictions: { where: { kind: "PRE_MATCH" }, orderBy: { createdAt: "asc" }, take: 1 }, maps: true },
  });

  let evaluated = 0;
  for (const m of matches) {
    if (!m.team1Id || !m.team2Id || m.team1Score == null || m.team2Score == null) continue;

    // No live-captured pre-match prediction (sync wasn't watching this match before
    // it finished) — reconstruct one bounded to data available as of kickoff, clearly
    // flagged as backfilled so it's never confused with a real-time call.
    const pre = m.predictions[0] ?? (await predictMatch(m.id, { backfill: true }));
    if (!pre) continue;

    const actualWinnerTeamId = m.team1Score > m.team2Score ? m.team1Id : m.team2Id;
    const predictedWinnerTeamId = pre.team1WinProb >= pre.team2WinProb ? m.team1Id : m.team2Id;
    const actualScore = m.team1Score > m.team2Score ? `${m.team1Score}-${m.team2Score}` : `${m.team2Score}-${m.team1Score}`;

    const scoreKeys = Object.keys(pre.seriesScoreProbsJson as Record<string, number>);
    const predictedTop = scoreKeys.length
      ? scoreKeys.reduce((best, k) => ((pre.seriesScoreProbsJson as Record<string, number>)[k] > (pre.seriesScoreProbsJson as Record<string, number>)[best] ? k : best), scoreKeys[0])
      : null;

    let mapsCorrect = 0;
    let mapsTotal = 0;
    const predictedMaps = Array.isArray(pre.predictedMapsJson) ? (pre.predictedMapsJson as Array<Record<string, unknown>>) : [];
    for (const map of m.maps) {
      if (map.status !== "COMPLETED" || !map.winnerTeamId) continue;
      const pm = predictedMaps.find((x) => x.mapName === map.mapName && x.confirmed);
      if (!pm) continue;
      mapsTotal++;
      const predictedWinner = (pm.team1WinProb as number) >= (pm.team2WinProb as number) ? m.team1Id : m.team2Id;
      if (predictedWinner === map.winnerTeamId) mapsCorrect++;
    }

    await prisma.matchEvaluation.create({
      data: {
        matchId: m.id,
        preMatchSnapshotId: pre.id,
        predictedWinnerTeamId,
        actualWinnerTeamId,
        predictedScore: predictedTop,
        actualScore,
        winnerCorrect: predictedWinnerTeamId === actualWinnerTeamId,
        scoreCorrect: predictedTop ? predictedTop.includes(actualScore) : null,
        mapsCorrect,
        mapsTotal,
        isBackfill: pre.isBackfill,
      },
    });
    evaluated++;
  }
  return { evaluated };
}
