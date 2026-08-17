import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  getUpcomingMatches,
  getResults,
  getMatchDetail,
  type VlrMatchListItem,
  type VlrMatchDetail,
} from "@/server/vlr/client";
import { regionFromEventName } from "@/lib/region";
import { toMapStatus, toMatchStatus } from "./status";
import { forEachThrottled } from "./util";

async function collectCandidateMatches(resultPages: number): Promise<VlrMatchListItem[]> {
  const byId = new Map<string, VlrMatchListItem>();

  try {
    const upcoming = await getUpcomingMatches();
    for (const m of upcoming) byId.set(m.id, m);
  } catch (err) {
    console.error("[sync:matches] failed to list upcoming:", err instanceof Error ? err.message : err);
  }

  for (let page = 1; page <= resultPages; page++) {
    try {
      const items = await getResults(page);
      if (items.length === 0) break;
      for (const m of items) byId.set(m.id, m);
    } catch (err) {
      console.error(`[sync:matches] failed to list results page=${page}:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  return [...byId.values()].filter((m) => regionFromEventName(m.tournament ?? m.event ?? ""));
}

async function ensureTeamStub(id: string, name: string, logo?: string | null) {
  await prisma.team.upsert({
    where: { id },
    create: { id, name, logoUrl: logo ?? null },
    update: { name, ...(logo ? { logoUrl: logo } : {}) },
  });
}

async function ensureEventStub(detail: VlrMatchDetail) {
  const region = regionFromEventName(detail.event.name);
  if (!region) return null;
  await prisma.event.upsert({
    where: { id: detail.event.id },
    create: {
      id: detail.event.id,
      name: detail.event.name,
      region,
      imgUrl: detail.event.img ?? null,
      sourceUrl: detail.event.url ?? null,
    },
    update: {},
  });
  return region;
}

function findMatchingStageId(stages: { id: string; name: string }[], seriesTitle: string | null | undefined) {
  if (!seriesTitle) return null;
  const s = seriesTitle.toLowerCase();
  const hit = stages.find((st) => s.includes(st.name.toLowerCase()));
  return hit?.id ?? null;
}

async function upsertMatchFromDetail(detail: VlrMatchDetail) {
  const region = await ensureEventStub(detail);
  const event = await prisma.event.findUnique({ where: { id: detail.event.id }, include: { stages: true } });
  if (!event) return; // not a tracked VCT event
  void region;

  const [t1, t2] = detail.teams;
  if (t1?.id) await ensureTeamStub(t1.id, t1.name, t1.img);
  if (t2?.id) await ensureTeamStub(t2.id, t2.name, t2.img);

  const status = toMatchStatus(detail.status);
  const stageId = findMatchingStageId(event.stages, detail.event.series);
  const scheduledAt = detail.timestamp ? new Date(detail.timestamp * 1000) : null;
  const mapsAnnounced = detail.maps.some((m) => m.name && m.name !== "TBD");

  await prisma.match.upsert({
    where: { id: detail.id },
    create: {
      id: detail.id,
      eventId: event.id,
      stageId,
      seriesTitle: detail.event.series ?? null,
      format: detail.format ?? null,
      status,
      scheduledAt,
      team1Id: t1?.id ?? null,
      team2Id: t2?.id ?? null,
      team1Score: t1?.score ?? null,
      team2Score: t2?.score ?? null,
      streamsJson: detail.streams ?? [],
      vodsJson: detail.vods ?? [],
      economyJson: (detail.economy as unknown as Prisma.InputJsonValue) ?? undefined,
      sourceUrl: detail.url ?? null,
      mapsAnnounced,
    },
    update: {
      stageId,
      seriesTitle: detail.event.series ?? null,
      format: detail.format ?? null,
      status,
      scheduledAt,
      team1Score: t1?.score ?? null,
      team2Score: t2?.score ?? null,
      streamsJson: detail.streams ?? [],
      vodsJson: detail.vods ?? [],
      economyJson: (detail.economy as unknown as Prisma.InputJsonValue) ?? undefined,
      mapsAnnounced,
    },
  });

  // Pick/bans
  await prisma.pickBan.deleteMany({ where: { matchId: detail.id } });
  if (detail.picksBans?.list?.length) {
    let order = 0;
    for (const pb of detail.picksBans.list) {
      const teamId = pb.team === t1?.name ? t1?.id : pb.team === t2?.name ? t2?.id : null;
      const type = pb.type?.toLowerCase().includes("ban")
        ? "BAN"
        : pb.type?.toLowerCase().includes("decider")
          ? "DECIDER"
          : "PICK";
      await prisma.pickBan.create({
        data: { matchId: detail.id, order: order++, type, teamId: teamId ?? null, mapName: pb.map, note: pb.type },
      });
    }
  }

  // Maps + player stats
  for (let i = 0; i < detail.maps.length; i++) {
    const map = detail.maps[i];
    if (!map.name || map.name === "TBD") continue;

    // map.teams is reported in the same order as the top-level match teams array.
    const [mt1, mt2] = map.teams;
    const mapStatus = toMapStatus(map.status);
    let winnerTeamId: string | null = null;
    if (mapStatus === "COMPLETED" && mt1?.score != null && mt2?.score != null) {
      if (mt1.score > mt2.score) winnerTeamId = t1?.id ?? null;
      else if (mt2.score > mt1.score) winnerTeamId = t2?.id ?? null;
    }
    const pickedByTeamId = map.pickedBy === t1?.name ? (t1?.id ?? null) : map.pickedBy === t2?.name ? (t2?.id ?? null) : null;

    const mapPlayed = await prisma.mapPlayed.upsert({
      where: { matchId_orderIndex: { matchId: detail.id, orderIndex: i } },
      create: {
        matchId: detail.id,
        orderIndex: i,
        mapName: map.name,
        status: mapStatus,
        pickedByTeamId,
        team1Score: mt1?.score ?? null,
        team2Score: mt2?.score ?? null,
        team1RoundsCt: mt1?.roundsCt ?? null,
        team1RoundsT: mt1?.roundsT ?? null,
        team2RoundsCt: mt2?.roundsCt ?? null,
        team2RoundsT: mt2?.roundsT ?? null,
        winnerTeamId,
      },
      update: {
        status: mapStatus,
        pickedByTeamId,
        team1Score: mt1?.score ?? null,
        team2Score: mt2?.score ?? null,
        team1RoundsCt: mt1?.roundsCt ?? null,
        team1RoundsT: mt1?.roundsT ?? null,
        team2RoundsCt: mt2?.roundsCt ?? null,
        team2RoundsT: mt2?.roundsT ?? null,
        winnerTeamId,
      },
    });

    // VLR lists a map's players as team1's five followed by team2's five;
    // teamTag is a short abbreviation we don't otherwise have a reliable id for.
    const half = Math.ceil(map.players.length / 2);
    for (let pi = 0; pi < map.players.length; pi++) {
      const p = map.players[pi];
      const resolvedTeamId = pi < half ? t1?.id : t2?.id;
      if (!resolvedTeamId) continue;

      await prisma.player.upsert({
        where: { id: p.id },
        create: { id: p.id, handle: p.name, country: p.flag ?? null, currentTeamId: resolvedTeamId, sourceUrl: p.url ?? null },
        update: { handle: p.name, country: p.flag ?? null },
      });

      await prisma.mapPlayerStat.upsert({
        where: { mapPlayedId_playerId: { mapPlayedId: mapPlayed.id, playerId: p.id } },
        create: {
          mapPlayedId: mapPlayed.id,
          playerId: p.id,
          teamId: resolvedTeamId,
          agentsJson: p.agents?.map((a) => a.name) ?? [],
          rating: p.stats.rating,
          acs: p.stats.acs,
          kills: p.stats.kills,
          deaths: p.stats.deaths,
          assists: p.stats.assists,
          kast: p.stats.kast,
          adr: p.stats.adr,
          hs: p.stats.hs,
          firstBloods: p.stats.firstBloods,
          firstDeaths: p.stats.firstDeaths,
        },
        update: {
          teamId: resolvedTeamId,
          agentsJson: p.agents?.map((a) => a.name) ?? [],
          rating: p.stats.rating,
          acs: p.stats.acs,
          kills: p.stats.kills,
          deaths: p.stats.deaths,
          assists: p.stats.assists,
          kast: p.stats.kast,
          adr: p.stats.adr,
          hs: p.stats.hs,
          firstBloods: p.stats.firstBloods,
          firstDeaths: p.stats.firstDeaths,
        },
      });
    }
  }
}

export async function syncMatches(opts?: { resultPages?: number; detailDelayMs?: number }) {
  const resultPages = opts?.resultPages ?? 3;
  const detailDelayMs = opts?.detailDelayMs ?? 650;

  const candidates = await collectCandidateMatches(resultPages);
  let synced = 0;

  await forEachThrottled(candidates, detailDelayMs, async (item) => {
    const detail = await getMatchDetail(item.id, "all");
    await upsertMatchFromDetail(detail);
    synced++;
  });

  return { synced, candidates: candidates.length };
}
