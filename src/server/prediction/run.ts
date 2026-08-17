import { prisma } from "@/lib/prisma";
import { recomputeAllRatings } from "./elo";
import { predictMatch } from "./engine";

export async function predictAllActive() {
  await recomputeAllRatings();

  const matches = await prisma.match.findMany({
    where: { status: { in: ["UPCOMING", "LIVE"] }, team1Id: { not: null }, team2Id: { not: null } },
    select: { id: true },
  });

  let predicted = 0;
  for (const m of matches) {
    try {
      const snap = await predictMatch(m.id);
      if (snap) predicted++;
    } catch (err) {
      console.error(`[predict] failed for match ${m.id}:`, err instanceof Error ? err.message : err);
    }
  }
  return { predicted, candidates: matches.length };
}

if (require.main === module) {
  predictAllActive()
    .then((r) => {
      console.log("[predict] done:", r);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
