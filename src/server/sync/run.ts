import { prisma } from "@/lib/prisma";
import { syncEvents } from "./events";
import { syncMatches } from "./matches";
import { syncTeamRosters } from "./teams";
import { predictAllActive } from "@/server/prediction/run";
import { evaluateFinishedMatches } from "@/server/data/insights";

export async function runFullSync() {
  const startedAt = new Date();
  console.log("[sync] starting full sync…");

  const eventsResult = await syncEvents().catch((err) => {
    console.error("[sync] syncEvents failed:", err);
    return { synced: 0, candidates: 0 };
  });
  console.log(`[sync] events: ${eventsResult.synced}/${eventsResult.candidates}`);

  const matchesResult = await syncMatches().catch((err) => {
    console.error("[sync] syncMatches failed:", err);
    return { synced: 0, candidates: 0, skipped: 0 };
  });
  console.log(`[sync] matches: ${matchesResult.synced}/${matchesResult.candidates} (${matchesResult.skipped} ya capturados, se saltaron)`);

  const rosterResult = await syncTeamRosters().catch((err) => {
    console.error("[sync] syncTeamRosters failed:", err);
    return { teamsSynced: 0, totalTeams: 0 };
  });
  console.log(`[sync] rosters: ${rosterResult.teamsSynced}/${rosterResult.totalTeams}`);

  const predictionResult = await predictAllActive().catch((err) => {
    console.error("[sync] predictAllActive failed:", err);
    return { predicted: 0, candidates: 0 };
  });
  console.log(`[sync] predictions: ${predictionResult.predicted}/${predictionResult.candidates}`);

  const evalResult = await evaluateFinishedMatches().catch((err) => {
    console.error("[sync] evaluateFinishedMatches failed:", err);
    return { evaluated: 0 };
  });
  console.log(`[sync] evaluations: ${evalResult.evaluated}`);

  await prisma.syncLog.create({
    data: {
      task: "full_sync",
      startedAt,
      finishedAt: new Date(),
      ok: true,
      itemsSynced: eventsResult.synced + matchesResult.synced,
      message: `events=${eventsResult.synced}/${eventsResult.candidates} matches=${matchesResult.synced}/${matchesResult.candidates}`,
    },
  });

  console.log("[sync] done.");
  return { eventsResult, matchesResult };
}

if (require.main === module) {
  runFullSync()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
