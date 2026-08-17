import { prisma } from "@/lib/prisma";
import type { Region } from "@prisma/client";

const START_RATING = 1500;
const K_FACTOR = 32;

/**
 * Recomputes an internal Elo-style rating for every team from scratch, walking
 * all FINAL matches in chronological order. This is OUR OWN derived metric
 * (the source has no official ranking endpoint) — never presented as an
 * official VCT ranking, only as "VCT Predicts Rating".
 */
export async function recomputeAllRatings() {
  await prisma.teamRating.deleteMany({});

  const matches = await prisma.match.findMany({
    where: { status: "FINAL", team1Id: { not: null }, team2Id: { not: null }, team1Score: { not: null }, team2Score: { not: null } },
    orderBy: [{ scheduledAt: "asc" }],
    select: {
      id: true,
      team1Id: true,
      team2Id: true,
      team1Score: true,
      team2Score: true,
      scheduledAt: true,
      lastSyncedAt: true,
      event: { select: { region: true } },
    },
  });

  const rating = new Map<string, number>();
  const played = new Map<string, number>();
  const rows: { teamId: string; region: Region; asOf: Date; rating: number; matchesConsidered: number }[] = [];

  for (const m of matches) {
    if (!m.team1Id || !m.team2Id || m.team1Score == null || m.team2Score == null) continue;
    if (m.team1Score === m.team2Score) continue; // no decisive result

    const r1 = rating.get(m.team1Id) ?? START_RATING;
    const r2 = rating.get(m.team2Id) ?? START_RATING;
    const expected1 = 1 / (1 + 10 ** ((r2 - r1) / 400));
    const actual1 = m.team1Score > m.team2Score ? 1 : 0;

    const newR1 = r1 + K_FACTOR * (actual1 - expected1);
    const newR2 = r2 + K_FACTOR * ((1 - actual1) - (1 - expected1));

    rating.set(m.team1Id, newR1);
    rating.set(m.team2Id, newR2);
    played.set(m.team1Id, (played.get(m.team1Id) ?? 0) + 1);
    played.set(m.team2Id, (played.get(m.team2Id) ?? 0) + 1);

    const asOf = m.scheduledAt ?? m.lastSyncedAt;
    const region = m.event.region;
    rows.push({ teamId: m.team1Id, region, asOf, rating: newR1, matchesConsidered: played.get(m.team1Id)! });
    rows.push({ teamId: m.team2Id, region, asOf, rating: newR2, matchesConsidered: played.get(m.team2Id)! });
  }

  if (rows.length) {
    await prisma.teamRating.createMany({ data: rows });
  }

  return { teamsRated: rating.size, matchesProcessed: matches.length };
}

export interface TeamRatingInfo {
  rating: number;
  matchesConsidered: number;
  hasHistory: boolean;
}

export async function getTeamRating(teamId: string): Promise<TeamRatingInfo> {
  const latest = await prisma.teamRating.findFirst({
    where: { teamId },
    orderBy: { asOf: "desc" },
  });
  if (!latest) return { rating: START_RATING, matchesConsidered: 0, hasHistory: false };
  return { rating: latest.rating, matchesConsidered: latest.matchesConsidered, hasHistory: true };
}

/**
 * Rating as it stood strictly before a given date — used for backfilled
 * ("what would we have predicted?") reconstructions, so they never peek at
 * results that hadn't happened yet.
 */
export async function getTeamRatingAsOf(teamId: string, before: Date): Promise<TeamRatingInfo> {
  const snapshot = await prisma.teamRating.findFirst({
    where: { teamId, asOf: { lt: before } },
    orderBy: { asOf: "desc" },
  });
  if (!snapshot) return { rating: START_RATING, matchesConsidered: 0, hasHistory: false };
  return { rating: snapshot.rating, matchesConsidered: snapshot.matchesConsidered, hasHistory: true };
}
