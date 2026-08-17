import { prisma } from "@/lib/prisma";

export interface RecentFormResult {
  matchesFound: number;
  wins: number;
  losses: number;
  winRate: number | null; // recency-weighted
  avgRoundDiff: number | null;
  last5: Array<"W" | "L">;
  avgRating: number | null;
}

const RECENCY_HALF_LIFE = 5; // matches

function recencyWeight(indexFromMostRecent: number) {
  return Math.pow(0.5, indexFromMostRecent / RECENCY_HALF_LIFE);
}

/** Recency-weighted recent form for a team, computed only from FINAL matches already in our DB. */
export async function getRecentForm(teamId: string, before?: Date, limit = 10): Promise<RecentFormResult> {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINAL",
      OR: [{ team1Id: teamId }, { team2Id: teamId }],
      ...(before ? { scheduledAt: { lt: before } } : {}),
      team1Score: { not: null },
      team2Score: { not: null },
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: { maps: true },
  });

  if (matches.length === 0) {
    return { matchesFound: 0, wins: 0, losses: 0, winRate: null, avgRoundDiff: null, last5: [], avgRating: null };
  }

  let weightedWins = 0;
  let totalWeight = 0;
  let wins = 0;
  let roundDiffSum = 0;
  let roundDiffCount = 0;
  const last5: Array<"W" | "L"> = [];

  matches.forEach((m, idx) => {
    const isTeam1 = m.team1Id === teamId;
    const own = isTeam1 ? m.team1Score! : m.team2Score!;
    const opp = isTeam1 ? m.team2Score! : m.team1Score!;
    const won = own > opp;
    if (won) wins++;
    const w = recencyWeight(idx);
    weightedWins += won ? w : 0;
    totalWeight += w;
    if (idx < 5) last5.push(won ? "W" : "L");

    for (const map of m.maps) {
      if (map.status !== "COMPLETED") continue;
      const ownRounds = isTeam1 ? (map.team1Score ?? null) : (map.team2Score ?? null);
      const oppRounds = isTeam1 ? (map.team2Score ?? null) : (map.team1Score ?? null);
      if (ownRounds != null && oppRounds != null) {
        roundDiffSum += ownRounds - oppRounds;
        roundDiffCount++;
      }
    }
  });

  const playerRatings = await prisma.mapPlayerStat.findMany({
    where: { teamId, map: { matchId: { in: matches.map((m) => m.id) } }, rating: { not: null } },
    select: { rating: true },
  });
  const avgRating = playerRatings.length
    ? playerRatings.reduce((s, r) => s + (r.rating ?? 0), 0) / playerRatings.length
    : null;

  return {
    matchesFound: matches.length,
    wins,
    losses: matches.length - wins,
    winRate: totalWeight > 0 ? weightedWins / totalWeight : null,
    avgRoundDiff: roundDiffCount > 0 ? roundDiffSum / roundDiffCount : null,
    last5,
    avgRating,
  };
}

export interface MapStatsResult {
  mapName: string;
  played: number;
  wins: number;
  winRate: number | null;
  atkWinRate: number | null;
  defWinRate: number | null;
}

/** Team's historical record on a specific map, decomposed into attack/defense using round-by-side data. */
export async function getMapStats(teamId: string, mapName: string, before?: Date): Promise<MapStatsResult> {
  const maps = await prisma.mapPlayed.findMany({
    where: {
      mapName,
      status: "COMPLETED",
      match: {
        OR: [{ team1Id: teamId }, { team2Id: teamId }],
        ...(before ? { scheduledAt: { lt: before } } : {}),
      },
    },
    include: { match: { select: { team1Id: true, team2Id: true } } },
  });

  if (maps.length === 0) {
    return { mapName, played: 0, wins: 0, winRate: null, atkWinRate: null, defWinRate: null };
  }

  let wins = 0;
  let ownT = 0;
  let ownCt = 0;
  let oppT = 0;
  let oppCt = 0;

  for (const m of maps) {
    const isTeam1 = m.match.team1Id === teamId;
    if (m.winnerTeamId === teamId) wins++;
    const oT = isTeam1 ? m.team1RoundsT : m.team2RoundsT;
    const oC = isTeam1 ? m.team1RoundsCt : m.team2RoundsCt;
    const pT = isTeam1 ? m.team2RoundsT : m.team1RoundsT;
    const pC = isTeam1 ? m.team2RoundsCt : m.team1RoundsCt;
    if (oT != null) ownT += oT;
    if (oC != null) ownCt += oC;
    if (pT != null) oppT += pT;
    if (pC != null) oppCt += pC;
  }

  // Attack-side rounds for this team are decided as either their own T-side win,
  // or the opponent's CT-side (defense) win against them — and symmetrically for defense.
  const atkTotal = ownT + oppCt;
  const defTotal = ownCt + oppT;

  return {
    mapName,
    played: maps.length,
    wins,
    winRate: wins / maps.length,
    atkWinRate: atkTotal > 0 ? ownT / atkTotal : null,
    defWinRate: defTotal > 0 ? ownCt / defTotal : null,
  };
}

export interface HeadToHeadResult {
  matchesFound: number;
  teamAWins: number;
  teamBWins: number;
  mapWinsA: number;
  mapWinsB: number;
  lastMeetingAt: Date | null;
  recentResults: Array<{ winnerId: string | null; scoreA: number; scoreB: number; date: Date | null }>;
}

export async function getHeadToHead(teamAId: string, teamBId: string, limit = 10, before?: Date): Promise<HeadToHeadResult> {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINAL",
      ...(before ? { scheduledAt: { lt: before } } : {}),
      OR: [
        { team1Id: teamAId, team2Id: teamBId },
        { team1Id: teamBId, team2Id: teamAId },
      ],
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: { maps: { where: { status: "COMPLETED" } } },
  });

  let teamAWins = 0;
  let teamBWins = 0;
  let mapWinsA = 0;
  let mapWinsB = 0;
  const recentResults: HeadToHeadResult["recentResults"] = [];

  for (const m of matches) {
    if (m.team1Score == null || m.team2Score == null) continue;
    const aIsTeam1 = m.team1Id === teamAId;
    const scoreA = aIsTeam1 ? m.team1Score : m.team2Score;
    const scoreB = aIsTeam1 ? m.team2Score : m.team1Score;
    if (scoreA > scoreB) teamAWins++;
    else if (scoreB > scoreA) teamBWins++;
    recentResults.push({ winnerId: scoreA > scoreB ? teamAId : scoreB > scoreA ? teamBId : null, scoreA, scoreB, date: m.scheduledAt });

    for (const map of m.maps) {
      if (map.winnerTeamId === teamAId) mapWinsA++;
      else if (map.winnerTeamId === teamBId) mapWinsB++;
    }
  }

  return {
    matchesFound: matches.length,
    teamAWins,
    teamBWins,
    mapWinsA,
    mapWinsB,
    lastMeetingAt: matches[0]?.scheduledAt ?? null,
    recentResults,
  };
}

export interface MapPoolTendency {
  mapName: string;
  played: number;
  picked: number;
  banned: number;
  winRate: number | null;
}

/** How often a team plays / picks / bans each map, and how it performs there — used for pre-veto map pool analysis. */
export async function getMapPoolTendency(teamId: string, before?: Date): Promise<MapPoolTendency[]> {
  const maps = await prisma.mapPlayed.findMany({
    where: {
      status: "COMPLETED",
      match: { OR: [{ team1Id: teamId }, { team2Id: teamId }], ...(before ? { scheduledAt: { lt: before } } : {}) },
    },
    select: { mapName: true, winnerTeamId: true },
  });
  const picks = await prisma.pickBan.findMany({
    where: { teamId, type: "PICK", match: before ? { scheduledAt: { lt: before } } : undefined },
    select: { mapName: true },
  });
  const bans = await prisma.pickBan.findMany({
    where: { teamId, type: "BAN", match: before ? { scheduledAt: { lt: before } } : undefined },
    select: { mapName: true },
  });

  const byMap = new Map<string, MapPoolTendency>();
  const ensure = (name: string) => {
    if (!byMap.has(name)) byMap.set(name, { mapName: name, played: 0, picked: 0, banned: 0, winRate: null });
    return byMap.get(name)!;
  };

  const winsByMap = new Map<string, number>();
  for (const m of maps) {
    const e = ensure(m.mapName);
    e.played++;
    if (m.winnerTeamId === teamId) winsByMap.set(m.mapName, (winsByMap.get(m.mapName) ?? 0) + 1);
  }
  for (const e of byMap.values()) {
    e.winRate = e.played > 0 ? (winsByMap.get(e.mapName) ?? 0) / e.played : null;
  }
  for (const p of picks) ensure(p.mapName).picked++;
  for (const b of bans) ensure(b.mapName).banned++;

  return [...byMap.values()].sort((a, b) => b.played - a.played);
}

export interface PistolStats {
  matchesFound: number;
  pistolsWon: number;
  pistolsTotal: number;
  winRate: number | null;
}

/** Pistol-round win rate aggregated from recent matches' series-level economy data. */
export async function getPistolStats(teamId: string, limit = 10, before?: Date): Promise<PistolStats> {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINAL",
      OR: [{ team1Id: teamId }, { team2Id: teamId }],
      economyJson: { not: null as never },
      ...(before ? { scheduledAt: { lt: before } } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    select: { team1Id: true, economyJson: true, maps: { select: { status: true } } },
  });

  let pistolsWon = 0;
  let pistolsTotal = 0;
  let matchesFound = 0;

  for (const m of matches) {
    const eco = m.economyJson as { teams?: Array<{ name: string; pistolWon: number }> } | null;
    if (!eco?.teams || eco.teams.length < 2) continue;
    const isTeam1 = m.team1Id === teamId;
    const teamEco = isTeam1 ? eco.teams[0] : eco.teams[1];
    if (typeof teamEco?.pistolWon !== "number") continue;
    const completedMaps = m.maps.filter((mp) => mp.status === "COMPLETED").length;
    if (completedMaps === 0) continue;
    matchesFound++;
    pistolsWon += teamEco.pistolWon;
    pistolsTotal += completedMaps * 2;
  }

  return { matchesFound, pistolsWon, pistolsTotal, winRate: pistolsTotal > 0 ? pistolsWon / pistolsTotal : null };
}

export interface TeamAggregateStats {
  seriesPlayed: number;
  seriesWinRate: number | null;
  mapsPlayed: number;
  mapWinRate: number | null;
  atkWinRate: number | null;
  defWinRate: number | null;
  avgRating: number | null;
  avgAcs: number | null;
  avgAdr: number | null;
  avgKast: number | null;
  kd: number | null;
}

/** Whole-history aggregate comparison stats for a team, computed only from data we actually stored. */
export async function getTeamAggregateStats(teamId: string): Promise<TeamAggregateStats> {
  const finalMatches = await prisma.match.findMany({
    where: { status: "FINAL", OR: [{ team1Id: teamId }, { team2Id: teamId }], team1Score: { not: null }, team2Score: { not: null } },
    select: { team1Id: true, team1Score: true, team2Score: true },
  });
  const seriesWins = finalMatches.filter((m) => (m.team1Id === teamId ? m.team1Score! > m.team2Score! : m.team2Score! > m.team1Score!)).length;

  const maps = await prisma.mapPlayed.findMany({
    where: { status: "COMPLETED", match: { OR: [{ team1Id: teamId }, { team2Id: teamId }] } },
    include: { match: { select: { team1Id: true } } },
  });
  let mapWins = 0;
  let ownT = 0,
    ownCt = 0,
    oppT = 0,
    oppCt = 0;
  for (const m of maps) {
    const isTeam1 = m.match.team1Id === teamId;
    if (m.winnerTeamId === teamId) mapWins++;
    const oT = isTeam1 ? m.team1RoundsT : m.team2RoundsT;
    const oC = isTeam1 ? m.team1RoundsCt : m.team2RoundsCt;
    const pT = isTeam1 ? m.team2RoundsT : m.team1RoundsT;
    const pC = isTeam1 ? m.team2RoundsCt : m.team1RoundsCt;
    if (oT != null) ownT += oT;
    if (oC != null) ownCt += oC;
    if (pT != null) oppT += pT;
    if (pC != null) oppCt += pC;
  }
  const atkTotal = ownT + oppCt;
  const defTotal = ownCt + oppT;

  const agg = await prisma.mapPlayerStat.aggregate({
    where: { teamId },
    _avg: { rating: true, acs: true, adr: true, kast: true },
    _sum: { kills: true, deaths: true },
  });

  return {
    seriesPlayed: finalMatches.length,
    seriesWinRate: finalMatches.length > 0 ? seriesWins / finalMatches.length : null,
    mapsPlayed: maps.length,
    mapWinRate: maps.length > 0 ? mapWins / maps.length : null,
    atkWinRate: atkTotal > 0 ? ownT / atkTotal : null,
    defWinRate: defTotal > 0 ? ownCt / defTotal : null,
    avgRating: agg._avg.rating,
    avgAcs: agg._avg.acs,
    avgAdr: agg._avg.adr,
    avgKast: agg._avg.kast,
    kd: agg._sum.deaths && agg._sum.deaths > 0 ? (agg._sum.kills ?? 0) / agg._sum.deaths : null,
  };
}
