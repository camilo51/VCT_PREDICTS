import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getTeamRating, getTeamRatingAsOf, type TeamRatingInfo } from "./elo";
import { getRecentForm, getMapStats, getHeadToHead, getMapPoolTendency, getPistolStats } from "./features";
import { seriesDistribution, overallWinProbability } from "./series";

const MODEL_VERSION = "v1-heuristic";

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function logit(p: number) {
  const c = clamp(p, 0.03, 0.97);
  return Math.log(c / (1 - c));
}
function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

interface WeightedEstimate {
  p: number; // probability team1 wins, from this one signal
  weight: number; // 0..1, confidence/sample-size of this signal
  maxWeight: number; // the weight this signal *would* have with perfect data (for data-completeness accounting)
  label: string;
}

function combine(estimates: WeightedEstimate[]) {
  const used = estimates.filter((e) => e.weight > 0);
  const totalWeight = used.reduce((s, e) => s + e.weight, 0);
  const maxPossible = estimates.reduce((s, e) => s + e.maxWeight, 0);
  if (totalWeight === 0) return { p: 0.5, dataCompleteness: 0 };
  const logitSum = used.reduce((s, e) => s + e.weight * logit(e.p), 0);
  return { p: sigmoid(logitSum / totalWeight), dataCompleteness: maxPossible > 0 ? totalWeight / maxPossible : 0 };
}

function parseBestOf(format: string | null): 1 | 3 | 5 {
  if (!format) return 3;
  const m = format.match(/(\d)/);
  const n = m ? Number(m[1]) : 3;
  return n === 1 ? 1 : n === 5 ? 5 : 3;
}

export interface MatchFactors {
  factorsFor1: string[];
  factorsFor2: string[];
  risks: string[];
}

export async function predictMatch(matchId: string, opts?: { backfill?: boolean }) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { maps: { orderBy: { orderIndex: "asc" } }, team1: true, team2: true, event: true },
  });
  if (!match || !match.team1Id || !match.team2Id || !match.team1 || !match.team2) return null;

  const isBackfill = opts?.backfill ?? false;
  if (isBackfill && !match.scheduledAt) return null; // no honest cutoff date to bound the reconstruction

  const bestOf = parseBestOf(match.format);
  const kind = isBackfill ? "PRE_MATCH" : match.status === "LIVE" ? "LIVE" : "PRE_MATCH";
  const asOf = isBackfill ? (match.scheduledAt ?? undefined) : match.status === "UPCOMING" ? (match.scheduledAt ?? undefined) : undefined;

  const [elo1, elo2]: [TeamRatingInfo, TeamRatingInfo] = isBackfill
    ? await Promise.all([getTeamRatingAsOf(match.team1Id, match.scheduledAt!), getTeamRatingAsOf(match.team2Id, match.scheduledAt!)])
    : await Promise.all([getTeamRating(match.team1Id), getTeamRating(match.team2Id)]);
  const [form1, form2] = await Promise.all([
    getRecentForm(match.team1Id, asOf, 10),
    getRecentForm(match.team2Id, asOf, 10),
  ]);
  const h2h = await getHeadToHead(match.team1Id, match.team2Id, 10, asOf);
  const [pistol1, pistol2] = await Promise.all([
    getPistolStats(match.team1Id, 10, asOf),
    getPistolStats(match.team2Id, 10, asOf),
  ]);

  const realMaps = match.maps.filter((m) => m.mapName && m.mapName !== "TBD");
  const mapsAnnounced = realMaps.length > 0;

  // --- overall (map-agnostic) blended probability, used as fallback per-map prob and for factor text ---
  const eloEstimate: WeightedEstimate = {
    p: 1 / (1 + 10 ** (-(elo1.rating - elo2.rating) / 400)),
    weight: elo1.hasHistory && elo2.hasHistory ? clamp(Math.min(elo1.matchesConsidered, elo2.matchesConsidered) / 8, 0, 1) : 0.15,
    maxWeight: 1,
    label: "rating",
  };
  const formEstimate: WeightedEstimate = {
    p: form1.winRate != null && form2.winRate != null ? sigmoid(3 * (form1.winRate - form2.winRate)) : 0.5,
    weight: form1.winRate != null && form2.winRate != null ? clamp(Math.min(form1.matchesFound, form2.matchesFound) / 8, 0, 1) : 0,
    maxWeight: 1,
    label: "form",
  };
  const h2hEstimate: WeightedEstimate = {
    p: h2h.teamAWins + h2h.teamBWins > 0 ? h2h.teamAWins / (h2h.teamAWins + h2h.teamBWins) : 0.5,
    weight: h2h.matchesFound > 0 ? clamp((h2h.teamAWins + h2h.teamBWins) / 5, 0, 1) * 0.7 : 0,
    maxWeight: 0.7,
    label: "h2h",
  };
  const rosterEstimate: WeightedEstimate = {
    p: form1.avgRating != null && form2.avgRating != null ? sigmoid(4 * (form1.avgRating - form2.avgRating)) : 0.5,
    weight: form1.avgRating != null && form2.avgRating != null ? 0.6 : 0,
    maxWeight: 0.6,
    label: "roster_rating",
  };

  const overall = combine([eloEstimate, formEstimate, h2hEstimate, rosterEstimate]);

  // --- per-map probabilities (real map stats when maps are confirmed) ---
  const mapProbs: number[] = [];
  const predictedMapsJson: Array<Record<string, unknown>> = [];

  if (mapsAnnounced) {
    for (const map of realMaps) {
      const [ms1, ms2] = await Promise.all([
        getMapStats(match.team1Id, map.mapName, asOf),
        getMapStats(match.team2Id, map.mapName, asOf),
      ]);
      const mapEstimate: WeightedEstimate = {
        p: ms1.winRate != null && ms2.winRate != null ? sigmoid(3 * (ms1.winRate - ms2.winRate)) : 0.5,
        weight: ms1.played > 0 && ms2.played > 0 ? clamp(Math.min(ms1.played, ms2.played) / 5, 0, 1) : 0,
        maxWeight: 1,
        label: "map",
      };
      const combined = combine([eloEstimate, formEstimate, mapEstimate, rosterEstimate]);
      mapProbs.push(combined.p);
      predictedMapsJson.push({
        orderIndex: map.orderIndex,
        mapName: map.mapName,
        status: map.status,
        team1WinProb: Math.round(combined.p * 100),
        team2WinProb: Math.round((1 - combined.p) * 100),
        team1Stats: ms1,
        team2Stats: ms2,
        confirmed: true,
      });
    }
    while (mapProbs.length < bestOf) mapProbs.push(overall.p);
  } else {
    for (let i = 0; i < bestOf; i++) mapProbs.push(overall.p);

    const [pool1, pool2] = await Promise.all([getMapPoolTendency(match.team1Id, asOf), getMapPoolTendency(match.team2Id, asOf)]);
    const byMap = new Map<string, number>();
    for (const p of pool1) byMap.set(p.mapName, (byMap.get(p.mapName) ?? 0) + p.played + p.picked * 1.5 - p.banned * 1.5);
    for (const p of pool2) byMap.set(p.mapName, (byMap.get(p.mapName) ?? 0) + p.played + p.picked * 1.5 - p.banned * 1.5);
    const entries = [...byMap.entries()].filter(([, score]) => score > 0);
    const total = entries.reduce((s, [, v]) => s + Math.max(v, 0), 0);
    const ranked = entries
      .map(([mapName, score]) => ({ mapName, probability: total > 0 ? Math.round((Math.max(score, 0) / total) * 100) : 0 }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 7);
    predictedMapsJson.push(...ranked.map((r) => ({ ...r, confirmed: false })));
  }

  const outcomes = seriesDistribution(mapProbs, bestOf);
  const seriesProb = overallWinProbability(outcomes);
  const seriesScoreProbsJson = Object.fromEntries(
    outcomes.map((o) => [`${o.winner === 1 ? match.team1!.name : match.team2!.name} ${o.label}`, Math.round(o.probability * 100)]),
  );

  // --- confidence (0-100), independent of the win probability's magnitude ---
  const eloGapFactor = elo1.hasHistory && elo2.hasHistory ? clamp(Math.abs(elo1.rating - elo2.rating) / 400, 0, 1) : 0;
  const mapsAnnouncedBonus = mapsAnnounced ? 1 : 0.35;
  const confidence = clamp(overall.dataCompleteness * 55 + eloGapFactor * 25 + mapsAnnouncedBonus * 20, 0, 100);

  const factors = buildFactors({ match, form1, form2, h2h, pistol1, pistol2, predictedMapsJson, mapsAnnounced, elo1, elo2 });

  await prisma.predictionSnapshot.updateMany({
    where: { matchId, kind, isActive: true },
    data: { isActive: false },
  });

  const snapshot = await prisma.predictionSnapshot.create({
    data: {
      matchId,
      kind,
      team1WinProb: Math.round(seriesProb.team1 * 100),
      team2WinProb: Math.round(seriesProb.team2 * 100),
      confidence: Math.round(confidence),
      seriesScoreProbsJson,
      predictedMapsJson: predictedMapsJson as unknown as Prisma.InputJsonValue,
      factorsForJson: { team1: factors.factorsFor1, team2: factors.factorsFor2 },
      factorsAgainstJson: factors.risks as unknown as Prisma.InputJsonValue,
      dataQuality: overall.dataCompleteness,
      modelVersion: MODEL_VERSION,
      isActive: true,
      isBackfill,
    },
  });

  return snapshot;
}

function buildFactors(args: {
  match: { team1: { name: string } | null; team2: { name: string } | null };
  form1: Awaited<ReturnType<typeof getRecentForm>>;
  form2: Awaited<ReturnType<typeof getRecentForm>>;
  h2h: Awaited<ReturnType<typeof getHeadToHead>>;
  pistol1: Awaited<ReturnType<typeof getPistolStats>>;
  pistol2: Awaited<ReturnType<typeof getPistolStats>>;
  predictedMapsJson: Array<Record<string, unknown>>;
  mapsAnnounced: boolean;
  elo1: Awaited<ReturnType<typeof getTeamRating>>;
  elo2: Awaited<ReturnType<typeof getTeamRating>>;
}): MatchFactors {
  const { match, form1, form2, h2h, pistol1, pistol2, predictedMapsJson, mapsAnnounced, elo1, elo2 } = args;
  const n1 = match.team1?.name ?? "Team 1";
  const n2 = match.team2?.name ?? "Team 2";
  const factorsFor1: string[] = [];
  const factorsFor2: string[] = [];
  const risks: string[] = [];

  const pushForBetter = (v1: number | null, v2: number | null, threshold: number, text: (leader: string, a: number, b: number) => string) => {
    if (v1 == null || v2 == null) return;
    if (Math.abs(v1 - v2) < threshold) return;
    const leader = v1 > v2 ? n1 : n2;
    const arr = v1 > v2 ? factorsFor1 : factorsFor2;
    arr.push(text(leader, v1, v2));
  };

  pushForBetter(form1.winRate, form2.winRate, 0.1, (leader, a, b) =>
    `Mejor forma reciente (${leader}: ${Math.round((leader === n1 ? a : b) * 100)}% de victorias ponderadas)`,
  );
  pushForBetter(form1.avgRating, form2.avgRating, 0.04, (leader) => `Mayor rating promedio de jugadores (${leader})`);
  pushForBetter(elo1.rating, elo2.rating, 40, (leader) => `Mejor rating interno VCT Predicts (${leader})`);
  pushForBetter(pistol1.winRate, pistol2.winRate, 0.1, (leader) => `Mayor porcentaje de pistol rounds ganados (${leader})`);

  if (mapsAnnounced) {
    for (const m of predictedMapsJson) {
      const mapName = m.mapName as string;
      const t1 = m.team1WinProb as number;
      const t2 = m.team2WinProb as number;
      if (Math.abs(t1 - t2) >= 15) {
        const arr = t1 > t2 ? factorsFor1 : factorsFor2;
        arr.push(`Ventaja en ${mapName} (${Math.max(t1, t2)}%)`);
      }
    }
  }

  if (h2h.matchesFound > 0 && h2h.teamAWins !== h2h.teamBWins) {
    const arr = h2h.teamAWins > h2h.teamBWins ? factorsFor1 : factorsFor2;
    arr.push(`Mejor historial reciente en el enfrentamiento directo (${h2h.teamAWins}-${h2h.teamBWins} en los últimos ${h2h.matchesFound})`);
  }

  if (h2h.matchesFound < 2) risks.push("Existe poca información reciente de enfrentamientos directos entre ambos equipos.");
  if (!mapsAnnounced) risks.push("El map pool todavía no está confirmado: la predicción usa un pool estimado, no los mapas reales.");
  if (form1.matchesFound < 4) risks.push(`Muestra de partidos recientes limitada para ${n1} (${form1.matchesFound} encontrados).`);
  if (form2.matchesFound < 4) risks.push(`Muestra de partidos recientes limitada para ${n2} (${form2.matchesFound} encontrados).`);
  if (!elo1.hasHistory || !elo2.hasHistory) risks.push("Uno de los equipos tiene historial insuficiente para el rating interno.");

  return { factorsFor1, factorsFor2, risks };
}
