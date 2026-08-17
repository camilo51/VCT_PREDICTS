export interface SeriesOutcome {
  label: string; // e.g. "2-1" (team1 perspective score-score)
  winner: 1 | 2;
  probability: number;
}

/**
 * Exact best-of-N score distribution given a per-map win probability for team1
 * on each map slot. `mapProbs` must have exactly `bestOf` entries — unplayed /
 * unconfirmed maps should be filled with a fallback blended probability by the
 * caller so this stays a pure combinatorial function.
 */
export function seriesDistribution(mapProbs: number[], bestOf: 1 | 3 | 5): SeriesOutcome[] {
  const winsNeeded = Math.ceil(bestOf / 2);
  const results: SeriesOutcome[] = [];

  function recurse(mapIndex: number, w1: number, w2: number, prob: number) {
    if (w1 === winsNeeded || w2 === winsNeeded) {
      const label = w1 === winsNeeded ? `${w1}-${w2}` : `${w2}-${w1}`;
      results.push({ label, winner: w1 === winsNeeded ? 1 : 2, probability: prob });
      return;
    }
    const p = mapProbs[mapIndex] ?? 0.5;
    recurse(mapIndex + 1, w1 + 1, w2, prob * p);
    recurse(mapIndex + 1, w1, w2 + 1, prob * (1 - p));
  }
  recurse(0, 0, 0, 1);

  // Merge duplicate labels (different paths can reach the same final score).
  const merged = new Map<string, SeriesOutcome>();
  for (const r of results) {
    const key = `${r.winner}-${r.label}`;
    const existing = merged.get(key);
    if (existing) existing.probability += r.probability;
    else merged.set(key, { ...r });
  }
  return [...merged.values()].sort((a, b) => b.probability - a.probability);
}

export function overallWinProbability(outcomes: SeriesOutcome[]): { team1: number; team2: number } {
  let team1 = 0;
  let team2 = 0;
  for (const o of outcomes) {
    if (o.winner === 1) team1 += o.probability;
    else team2 += o.probability;
  }
  return { team1, team2 };
}
