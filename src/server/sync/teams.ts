import { prisma } from "@/lib/prisma";
import { getTeamDetail, getPlayerDetail } from "@/server/vlr/client";
import { forEachThrottled } from "./util";

/**
 * Authoritative current-roster sync.
 *
 * Event pages show the roster *as it was during that tournament*, so if we only
 * relied on event syncing, an old finished event processed after a live one
 * could overwrite a team's roster with stale, long-departed players. The
 * dedicated /teams/{id} endpoint is VLR's actual "current roster" source, so
 * we treat it as the final word and run it last, after all event/match syncing.
 *
 * VLR occasionally lists the same player as active on two team pages at once
 * (one of them just hasn't been updated after a transfer) — in that case we
 * resolve the conflict with the player's own profile page, which reflects a
 * single current team.
 */
export async function syncTeamRosters() {
  const teams = await prisma.team.findMany({ select: { id: true } });

  // Phase 1: fetch every team's current roster without writing yet, so we can
  // spot players claimed active by more than one team before committing anything.
  const perTeamActive = new Map<string, Array<{ id: string; user: string; name: string; country: string; url: string }>>();
  const claimedBy = new Map<string, Set<string>>(); // playerId -> team ids that list them active

  await forEachThrottled(teams, 500, async (team) => {
    const detail = await getTeamDetail(team.id);
    perTeamActive.set(team.id, detail.players);
    for (const p of detail.players) {
      if (!p.id) continue;
      if (!claimedBy.has(p.id)) claimedBy.set(p.id, new Set());
      claimedBy.get(p.id)!.add(team.id);
    }
  });

  // Phase 2: resolve conflicts (rare) via the player's own profile, which VLR
  // treats as the single source of truth for "current team".
  const resolvedTeamFor = new Map<string, string>(); // playerId -> team id to assign
  const conflicted = [...claimedBy.entries()].filter(([, teamIds]) => teamIds.size > 1);

  await forEachThrottled(conflicted, 500, async ([playerId, teamIds]) => {
    try {
      const profile = await getPlayerDetail(playerId);
      if (profile.team?.id) resolvedTeamFor.set(playerId, profile.team.id); // trust the profile even if it names a team outside the conflict set
      console.warn(`[sync:rosters] ${playerId} claimed by teams [${[...teamIds].join(",")}] — resolved to ${profile.team?.id ?? "unknown"} via profile`);
    } catch (err) {
      console.error(`[sync:rosters] failed to resolve conflict for player ${playerId}:`, err instanceof Error ? err.message : err);
    }
  });

  // Phase 3: write. Single-claim players go straight to their one team;
  // conflicted players go to whatever phase 2 resolved (skipped if resolution failed).
  let synced = 0;
  for (const [teamId, players] of perTeamActive.entries()) {
    const activeIdsForTeam: string[] = [];

    for (const p of players) {
      if (!p.id) continue;
      const owners = claimedBy.get(p.id)!;
      const finalTeamId = owners.size > 1 ? resolvedTeamFor.get(p.id) : teamId;
      if (finalTeamId !== teamId) continue; // this team lost the conflict (or resolution failed) — don't claim them
      activeIdsForTeam.push(p.id);

      const handle = p.user || p.name;
      await prisma.player.upsert({
        where: { id: p.id },
        create: { id: p.id, handle, realName: p.name || null, country: p.country ?? null, currentTeamId: teamId, active: true, sourceUrl: p.url ?? null },
        update: { handle, realName: p.name || null, country: p.country ?? null, currentTeamId: teamId, active: true },
      });
    }

    // Anyone we still have linked to this team that it no longer lists as active
    // (or that lost a cross-team conflict) has left — clear them.
    if (activeIdsForTeam.length > 0) {
      await prisma.player.updateMany({
        where: { currentTeamId: teamId, id: { notIn: activeIdsForTeam } },
        data: { currentTeamId: null, active: false },
      });
    }

    synced++;
  }

  return { teamsSynced: synced, totalTeams: teams.length, conflicts: conflicted.length };
}
