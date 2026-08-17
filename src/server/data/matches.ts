import { prisma } from "@/lib/prisma";
import type { MatchStatus, Region } from "@prisma/client";

const matchListInclude = {
  event: true,
  stage: true,
  team1: true,
  team2: true,
  maps: { orderBy: { orderIndex: "asc" as const } },
  predictions: { where: { isActive: true }, orderBy: { createdAt: "desc" as const } },
};

export type MatchListRow = NonNullable<Awaited<ReturnType<typeof listMatches>>>[number];

export interface MatchFilters {
  status?: MatchStatus[];
  region?: Region;
  eventId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  page?: number;
  pageSize?: number;
  hasPrediction?: boolean;
}

function buildMatchWhere(filters: MatchFilters) {
  return {
    status: filters.status ? { in: filters.status } : undefined,
    event: filters.region ? { region: filters.region } : undefined,
    eventId: filters.eventId,
    scheduledAt:
      filters.from || filters.to ? { gte: filters.from ?? undefined, lte: filters.to ?? undefined } : undefined,
    predictions: filters.hasPrediction ? { some: { isActive: true } } : undefined,
  };
}

export async function listMatches(filters: MatchFilters = {}) {
  const pageSize = filters.pageSize ?? filters.limit;
  return prisma.match.findMany({
    where: buildMatchWhere(filters),
    include: matchListInclude,
    orderBy: { scheduledAt: filters.status?.includes("FINAL") ? "desc" : "asc" },
    take: pageSize,
    skip: filters.page && pageSize ? (filters.page - 1) * pageSize : undefined,
  });
}

export async function countMatches(filters: MatchFilters = {}) {
  return prisma.match.count({ where: buildMatchWhere(filters) });
}

export async function getMatchDetail(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      event: { include: { stages: true } },
      stage: true,
      team1: { include: { players: true } },
      team2: { include: { players: true } },
      maps: {
        orderBy: { orderIndex: "asc" },
        include: { playerStats: { include: { player: true } }, winnerTeam: true, pickedBy: true },
      },
      pickBans: { orderBy: { order: "asc" } },
      predictions: { orderBy: { createdAt: "desc" } },
      evaluation: true,
    },
  });
}

export async function listDistinctTournaments(region?: Region) {
  return prisma.event.findMany({
    where: { region },
    orderBy: { lastSyncedAt: "desc" },
    select: { id: true, name: true, region: true, status: true },
  });
}
