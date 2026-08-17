import { prisma } from "@/lib/prisma";

export interface MapOverview {
  mapName: string;
  played: number;
  pickRate: number | null;
  banRate: number | null;
  atkWinRate: number | null;
  defWinRate: number | null;
}

export async function listMapsOverview(): Promise<MapOverview[]> {
  const maps = await prisma.mapPlayed.findMany({
    where: { status: "COMPLETED" },
    select: { mapName: true, team1RoundsT: true, team1RoundsCt: true, team2RoundsT: true, team2RoundsCt: true },
  });
  const pickBans = await prisma.pickBan.findMany({ select: { mapName: true, type: true } });
  const totalMatchesWithVeto = new Set((await prisma.pickBan.findMany({ select: { matchId: true } })).map((p) => p.matchId)).size;

  const byMap = new Map<string, { played: number; t: number; ct: number }>();
  for (const m of maps) {
    const e = byMap.get(m.mapName) ?? { played: 0, t: 0, ct: 0 };
    e.played++;
    e.t += (m.team1RoundsT ?? 0) + (m.team2RoundsT ?? 0);
    e.ct += (m.team1RoundsCt ?? 0) + (m.team2RoundsCt ?? 0);
    byMap.set(m.mapName, e);
  }

  const picks = new Map<string, number>();
  const bans = new Map<string, number>();
  for (const pb of pickBans) {
    if (pb.type === "PICK") picks.set(pb.mapName, (picks.get(pb.mapName) ?? 0) + 1);
    if (pb.type === "BAN") bans.set(pb.mapName, (bans.get(pb.mapName) ?? 0) + 1);
  }

  const names = new Set([...byMap.keys(), ...picks.keys(), ...bans.keys()]);
  return [...names]
    .map((mapName) => {
      const e = byMap.get(mapName);
      const total = (e?.t ?? 0) + (e?.ct ?? 0);
      return {
        mapName,
        played: e?.played ?? 0,
        pickRate: totalMatchesWithVeto > 0 ? (picks.get(mapName) ?? 0) / totalMatchesWithVeto : null,
        banRate: totalMatchesWithVeto > 0 ? (bans.get(mapName) ?? 0) / totalMatchesWithVeto : null,
        atkWinRate: total > 0 ? (e?.t ?? 0) / total : null,
        defWinRate: total > 0 ? (e?.ct ?? 0) / total : null,
      };
    })
    .sort((a, b) => b.played - a.played);
}

export interface MapTeamRow {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  winRate: number;
}

export interface MapPlayerRow {
  playerId: string;
  handle: string;
  mapsPlayed: number;
  avgRating: number;
}

export async function getMapDetail(mapName: string) {
  const maps = await prisma.mapPlayed.findMany({
    where: { mapName, status: "COMPLETED" },
    include: { match: { include: { team1: true, team2: true } } },
  });

  const teamTally = new Map<string, { teamName: string; played: number; wins: number }>();
  for (const m of maps) {
    for (const [teamId, teamName] of [
      [m.match.team1Id, m.match.team1?.name],
      [m.match.team2Id, m.match.team2?.name],
    ] as const) {
      if (!teamId || !teamName) continue;
      const e = teamTally.get(teamId) ?? { teamName, played: 0, wins: 0 };
      e.played++;
      if (m.winnerTeamId === teamId) e.wins++;
      teamTally.set(teamId, e);
    }
  }
  const topTeams: MapTeamRow[] = [...teamTally.entries()]
    .filter(([, v]) => v.played >= 2)
    .map(([teamId, v]) => ({ teamId, teamName: v.teamName, played: v.played, wins: v.wins, winRate: v.wins / v.played }))
    .sort((a, b) => b.winRate - a.winRate || b.played - a.played)
    .slice(0, 8);

  const playerStats = await prisma.mapPlayerStat.groupBy({
    by: ["playerId"],
    where: { map: { mapName, status: "COMPLETED" } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const players = await prisma.player.findMany({ where: { id: { in: playerStats.map((p) => p.playerId) } } });
  const byId = new Map(players.map((p) => [p.id, p]));
  const topPlayers: MapPlayerRow[] = playerStats
    .filter((p) => p._count._all >= 2 && p._avg.rating != null)
    .map((p) => ({ playerId: p.playerId, handle: byId.get(p.playerId)?.handle ?? "?", mapsPlayed: p._count._all, avgRating: p._avg.rating! }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 8);

  const overview = (await listMapsOverview()).find((m) => m.mapName === mapName) ?? null;

  return { overview, topTeams, topPlayers, totalMaps: maps.length };
}
