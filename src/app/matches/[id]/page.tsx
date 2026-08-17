import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/server/data/matches";
import {
  getPlayerAggregate,
  pickPlayerToWatch,
  buildKeyMatchups,
  getAgentComposition,
  getTeamRankingInRegion,
} from "@/server/data/insights";
import { getTeamAggregateStats, getRecentForm, getHeadToHead, getPistolStats } from "@/server/prediction/features";
import { DuelBar, CompareBar } from "@/components/DuelBar";
import { ConfidenceMeter, StatusBadge, MapPoolBadge } from "@/components/Badges";
import { Countdown } from "@/components/Countdown";
import { SectionCard } from "@/components/SectionCard";
import { REGION_LABEL } from "@/lib/region";
import { formatMatchDateLabel, formatRelativeTime, pct } from "@/lib/format";
import { proxiedLogo } from "@/lib/image";

export const dynamic = "force-dynamic";

interface ConfirmedMapPrediction {
  mapName: string;
  status: string;
  team1WinProb: number;
  team2WinProb: number;
  team1Stats: { winRate: number | null; atkWinRate: number | null; defWinRate: number | null; played: number };
  team2Stats: { winRate: number | null; atkWinRate: number | null; defWinRate: number | null; played: number };
  confirmed: true;
}
interface HypotheticalMapPrediction {
  mapName: string;
  probability: number;
  confirmed: false;
}

function TeamLogo({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded bg-bg-elevated-2 font-display text-text-dim"
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Image src={proxiedLogo(url)!} alt={name} fill sizes={`${size}px`} className="object-contain" unoptimized />
    </div>
  );
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) notFound();

  const t1 = match.team1;
  const t2 = match.team2;
  const preMatch = match.predictions.find((p) => p.kind === "PRE_MATCH" && p.isActive);
  const live = match.predictions.find((p) => p.kind === "LIVE" && p.isActive);
  const activePrediction = live ?? preMatch;

  const canAnalyze = !!(t1 && t2);

  const [
    stats1,
    stats2,
    form1,
    form2,
    h2h,
    pistol1,
    pistol2,
    rank1,
    rank2,
    playerToWatch,
    keyMatchups,
    agentComp1,
    agentComp2,
    roster1Agg,
    roster2Agg,
  ] = canAnalyze
    ? await Promise.all([
        getTeamAggregateStats(t1!.id),
        getTeamAggregateStats(t2!.id),
        getRecentForm(t1!.id),
        getRecentForm(t2!.id),
        getHeadToHead(t1!.id, t2!.id, 10),
        getPistolStats(t1!.id, 10),
        getPistolStats(t2!.id, 10),
        getTeamRankingInRegion(t1!.id, match.event.region),
        getTeamRankingInRegion(t2!.id, match.event.region),
        pickPlayerToWatch(
          { id: t1!.id, name: t1!.name, players: t1!.players.map((p) => ({ id: p.id, handle: p.handle })) },
          { id: t2!.id, name: t2!.name, players: t2!.players.map((p) => ({ id: p.id, handle: p.handle })) },
        ),
        buildKeyMatchups(
          t1!.players.map((p) => ({ id: p.id, handle: p.handle })),
          t2!.players.map((p) => ({ id: p.id, handle: p.handle })),
        ),
        getAgentComposition(t1!.id),
        getAgentComposition(t2!.id),
        Promise.all(t1!.players.map((p) => getPlayerAggregate(p.id, p.handle))),
        Promise.all(t2!.players.map((p) => getPlayerAggregate(p.id, p.handle))),
      ])
    : [null, null, null, null, null, null, null, null, null, null, null, null, null, [], []];

  const predictedMaps = (activePrediction?.predictedMapsJson as unknown as
    | ConfirmedMapPrediction[]
    | HypotheticalMapPrediction[]
    | null) ?? [];
  const mapsConfirmed = predictedMaps.length > 0 && (predictedMaps[0] as { confirmed: boolean }).confirmed;

  const seriesScores = activePrediction
    ? (Object.entries(activePrediction.seriesScoreProbsJson as Record<string, number>).sort((a, b) => b[1] - a[1]))
    : [];
  const factorsFor = activePrediction ? (activePrediction.factorsForJson as { team1: string[]; team2: string[] }) : null;
  const risks = activePrediction ? (activePrediction.factorsAgainstJson as string[]) : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <Link href="/matches" className="mb-4 inline-block text-xs text-text-faint hover:text-text-dim">
        ← Todos los partidos
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-border bg-bg-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-text-faint">
          <span>
            {REGION_LABEL[match.event.region]} · {match.event.name}
            {match.stage ? ` · ${match.stage.name}` : ""}
          </span>
          <StatusBadge status={match.status} />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <TeamLogo name={t1?.name ?? "TBD"} url={t1?.logoUrl ?? null} size={56} />
            <div>
              <div className="font-display text-xl tracking-wide sm:text-2xl">{t1?.name ?? "Por definir"}</div>
              {rank1?.rank && <div className="text-xs text-text-faint">#{rank1.rank} {REGION_LABEL[match.event.region]}</div>}
            </div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-text-faint">
              {match.status === "FINAL" ? `${match.team1Score}–${match.team2Score}` : "VS"}
            </div>
            <div className="mt-1 font-data text-xs text-text-dim">{match.format}</div>
          </div>
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
            <TeamLogo name={t2?.name ?? "TBD"} url={t2?.logoUrl ?? null} size={56} />
            <div>
              <div className="font-display text-xl tracking-wide sm:text-2xl">{t2?.name ?? "Por definir"}</div>
              {rank2?.rank && <div className="text-xs text-text-faint">#{rank2.rank} {REGION_LABEL[match.event.region]}</div>}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-text-dim">
          <span>{match.scheduledAt ? formatMatchDateLabel(new Date(match.scheduledAt)) : "Horario por confirmar"}</span>
          {match.status === "UPCOMING" && match.scheduledAt && (
            <span className="text-text-faint">
              · Comienza en <Countdown target={match.scheduledAt} />
            </span>
          )}
        </div>
      </header>

      {!canAnalyze && (
        <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-text-faint">
          Uno de los equipos todavía no está definido (fase de bracket pendiente). El análisis se generará automáticamente en cuanto ambos equipos estén confirmados.
        </div>
      )}

      {canAnalyze && (
        <>
          {/* Main prediction */}
          <SectionCard title="Predicción de la serie" className="mt-6" eyebrow={live ? "Predicción en vivo" : "Predicción pre-partido"}>
            {activePrediction ? (
              <>
                {activePrediction.isBackfill && (
                  <p className="mb-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                    Reconstruida después del partido — el sync no estaba activo cuando este partido era &quot;próximo&quot;, así que esta predicción se calculó con los datos que existían justo antes del inicio, no en tiempo real.
                  </p>
                )}
                <DuelBar leftLabel={t1!.name} rightLabel={t2!.name} leftPct={activePrediction.team1WinProb} rightPct={activePrediction.team2WinProb} size="lg" />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <ConfidenceMeter score={activePrediction.confidence} />
                  <span className="text-xs text-text-faint">
                    Predicción actualizada {formatRelativeTime(activePrediction.createdAt)}
                  </span>
                </div>

                {seriesScores.length > 0 && (
                  <div className="mt-5 border-t border-border-soft pt-4">
                    <h3 className="mb-2 text-xs uppercase tracking-wide text-text-faint">Probabilidad de resultado</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                      {seriesScores.map(([label, prob]) => (
                        <div key={label} className="flex items-center justify-between rounded bg-bg-elevated-2 px-2.5 py-1.5 text-sm">
                          <span className="truncate text-text-dim">{label}</span>
                          <span className="font-data text-text">{prob}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-text-dim">
                      Predicción principal: <span className="font-display text-text">{seriesScores[0][0]}</span>
                    </p>
                  </div>
                )}

                {preMatch && live && (
                  <p className="mt-3 text-xs text-text-faint">
                    Predicción pre-partido: {t1!.name} {preMatch.team1WinProb}% · {t2!.name} {preMatch.team2WinProb}% (conservada para comparar con el resultado final).
                  </p>
                )}
              </>
            ) : (
              <p className="text-text-faint">Predicción no disponible todavía — datos insuficientes.</p>
            )}
          </SectionCard>

          {/* Map pool / confirmed maps */}
          <SectionCard title={mapsConfirmed ? "Mapas confirmados" : "Map pool estimado"} className="mt-4">
            <div className="mb-3">
              <MapPoolBadge announced={match.mapsAnnounced} />
              {!mapsConfirmed && (
                <p className="mt-2 text-xs text-text-faint">
                  Mapas aún no confirmados. Estas son estimaciones basadas en el historial de picks/bans y win rate por mapa de ambos equipos — no son los mapas reales.
                </p>
              )}
            </div>

            {mapsConfirmed ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(predictedMaps as ConfirmedMapPrediction[]).map((m) => (
                  <div key={m.mapName} className="rounded-md border border-border-soft bg-bg-elevated-2 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-display tracking-wide">{m.mapName}</span>
                      <span className="text-[10px] uppercase text-text-faint">{m.status}</span>
                    </div>
                    <DuelBar leftLabel={t1!.name} rightLabel={t2!.name} leftPct={m.team1WinProb} rightPct={m.team2WinProb} size="sm" />
                    <div className="mt-3 space-y-1 text-xs text-text-dim">
                      <div className="flex justify-between"><span>Win rate histórico</span><span className="font-data">{pct(m.team1Stats.winRate)} / {pct(m.team2Stats.winRate)}</span></div>
                      <div className="flex justify-between"><span>Attack win rate</span><span className="font-data">{pct(m.team1Stats.atkWinRate)} / {pct(m.team2Stats.atkWinRate)}</span></div>
                      <div className="flex justify-between"><span>Defense win rate</span><span className="font-data">{pct(m.team1Stats.defWinRate)} / {pct(m.team2Stats.defWinRate)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (predictedMaps as HypotheticalMapPrediction[]).length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(predictedMaps as HypotheticalMapPrediction[]).map((m) => (
                  <div key={m.mapName} className="rounded-md border border-border-soft bg-bg-elevated-2 px-3 py-2.5">
                    <div className="font-display tracking-wide">{m.mapName}</div>
                    <div className="font-data text-sm text-team-b">{m.probability}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-faint">No hay historial de mapas suficiente para estimar el pool.</p>
            )}
          </SectionCard>

          {/* Why the model favors X */}
          {factorsFor && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SectionCard title={`Ventajas de ${t1!.name}`}>
                {factorsFor.team1.length ? (
                  <ul className="space-y-2 text-sm text-text-dim">
                    {factorsFor.team1.map((f, i) => (
                      <li key={i} className="flex gap-2"><span className="text-team-a">▸</span>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-faint text-sm">Sin ventajas claras detectadas en los datos disponibles.</p>
                )}
              </SectionCard>
              <SectionCard title={`Ventajas de ${t2!.name}`}>
                {factorsFor.team2.length ? (
                  <ul className="space-y-2 text-sm text-text-dim">
                    {factorsFor.team2.map((f, i) => (
                      <li key={i} className="flex gap-2"><span className="text-team-b">▸</span>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-faint text-sm">Sin ventajas claras detectadas en los datos disponibles.</p>
                )}
              </SectionCard>
            </div>
          )}

          {risks.length > 0 && (
            <SectionCard title="¿Qué podría hacer fallar esta predicción?" className="mt-4">
              <ul className="space-y-2 text-sm text-text-dim">
                {risks.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-warn">⚠</span>{r}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Team comparison */}
          <SectionCard title="Comparación de equipos" className="mt-4">
            <div className="flex items-center justify-between px-1 pb-2 text-xs uppercase tracking-wide text-text-faint">
              <span className="text-team-a">{t1!.name}</span>
              <span className="text-team-b">{t2!.name}</span>
            </div>
            <div className="divide-y divide-border-soft">
              <CompareBar label="Win rate" aValue={stats1!.seriesWinRate} bValue={stats2!.seriesWinRate} format={(v) => `${Math.round(v * 100)}%`} />
              <CompareBar label="Map win rate" aValue={stats1!.mapWinRate} bValue={stats2!.mapWinRate} format={(v) => `${Math.round(v * 100)}%`} />
              <CompareBar label="Rating" aValue={stats1!.avgRating} bValue={stats2!.avgRating} />
              <CompareBar label="ACS" aValue={stats1!.avgAcs} bValue={stats2!.avgAcs} format={(v) => v.toFixed(0)} />
              <CompareBar label="ADR" aValue={stats1!.avgAdr} bValue={stats2!.avgAdr} format={(v) => v.toFixed(0)} />
              <CompareBar label="KAST" aValue={stats1!.avgKast} bValue={stats2!.avgKast} format={(v) => `${v.toFixed(0)}%`} />
              <CompareBar label="K/D" aValue={stats1!.kd} bValue={stats2!.kd} />
              <CompareBar label="Attack %" aValue={stats1!.atkWinRate} bValue={stats2!.atkWinRate} format={(v) => `${Math.round(v * 100)}%`} />
              <CompareBar label="Defense %" aValue={stats1!.defWinRate} bValue={stats2!.defWinRate} format={(v) => `${Math.round(v * 100)}%`} />
              <CompareBar label="Pistol %" aValue={pistol1!.winRate} bValue={pistol2!.winRate} format={(v) => `${Math.round(v * 100)}%`} />
              <CompareBar label="Clutch %" aValue={null} bValue={null} />
            </div>
          </SectionCard>

          {/* Recent form */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[{ team: t1!, form: form1! }, { team: t2!, form: form2! }].map(({ team, form }) => (
              <SectionCard key={team.id} title={`Forma reciente — ${team.name}`}>
                <div className="mb-3 flex gap-1.5">
                  {form.last5.length ? (
                    form.last5.map((r, i) => (
                      <span
                        key={i}
                        className={`flex h-7 w-7 items-center justify-center rounded font-display text-xs ${r === "W" ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}
                      >
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-faint">Sin partidos recientes registrados</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-text-dim sm:grid-cols-4">
                  <div><div className="text-text-faint text-xs">Partidos</div>{form.matchesFound}</div>
                  <div><div className="text-text-faint text-xs">Victorias</div>{form.wins}</div>
                  <div><div className="text-text-faint text-xs">Derrotas</div>{form.losses}</div>
                  <div><div className="text-text-faint text-xs">Dif. rondas</div>{form.avgRoundDiff != null ? form.avgRoundDiff.toFixed(1) : "Sin datos"}</div>
                </div>
              </SectionCard>
            ))}
          </div>

          {/* Head to head */}
          <SectionCard title="Head-to-Head" className="mt-4">
            {h2h!.matchesFound === 0 ? (
              <p className="text-text-faint text-sm">Sin enfrentamientos previos registrados entre ambos equipos.</p>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-center gap-6 font-display text-2xl">
                  <span className="text-team-a">{h2h!.teamAWins}</span>
                  <span className="text-text-faint text-sm">victorias en {h2h!.matchesFound}</span>
                  <span className="text-team-b">{h2h!.teamBWins}</span>
                </div>
                <div className="text-center text-xs text-text-faint mb-3">
                  Mapas: {h2h!.mapWinsA}-{h2h!.mapWinsB} · Último enfrentamiento: {h2h!.lastMeetingAt ? formatRelativeTime(new Date(h2h!.lastMeetingAt)) : "—"}
                </div>
                <ul className="space-y-1 text-sm text-text-dim">
                  {h2h!.recentResults.map((r, i) => (
                    <li key={i} className="flex justify-between border-t border-border-soft py-1.5 first:border-t-0">
                      <span>{r.date ? new Date(r.date).toLocaleDateString("es-ES") : "—"}</span>
                      <span className="font-data">{r.scoreA}-{r.scoreB}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SectionCard>

          {/* Player to watch */}
          {playerToWatch && (
            <SectionCard title="Player to Watch" className="mt-4">
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl text-team-a">{playerToWatch.handle}</div>
                <span className="text-xs text-text-faint">{playerToWatch.teamName}</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-text-dim">
                {playerToWatch.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-team-a">▸</span>{r}</li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Key matchups */}
          <SectionCard title="Key Matchups" className="mt-4">
            <div className="space-y-4">
              {keyMatchups!.filter((m) => m.playerA || m.playerB).map((m) => (
                <div key={m.role} className="rounded-md border border-border-soft p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-text-faint">{m.role} matchup</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-display text-team-a">{m.playerA?.handle ?? "—"}</div>
                      {m.playerA && (
                        <div className="mt-1 space-y-0.5 text-xs text-text-dim font-data">
                          <div>Rating {m.playerA.aggregate.avgRating?.toFixed(2) ?? "—"}</div>
                          <div>ACS {m.playerA.aggregate.avgAcs?.toFixed(0) ?? "—"}</div>
                          <div>K/D {m.playerA.aggregate.kd?.toFixed(2) ?? "—"}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-display text-team-b">{m.playerB?.handle ?? "—"}</div>
                      {m.playerB && (
                        <div className="mt-1 space-y-0.5 text-xs text-text-dim font-data">
                          <div>Rating {m.playerB.aggregate.avgRating?.toFixed(2) ?? "—"}</div>
                          <div>ACS {m.playerB.aggregate.avgAcs?.toFixed(0) ?? "—"}</div>
                          <div>K/D {m.playerB.aggregate.kd?.toFixed(2) ?? "—"}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Rosters */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[{ team: t1!, agg: roster1Agg }, { team: t2!, agg: roster2Agg }].map(({ team, agg }) => (
              <SectionCard key={team.id} title={`Jugadores — ${team.name}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase text-text-faint">
                        <th className="pb-2 font-normal">Jugador</th>
                        <th className="pb-2 font-normal text-right">Rating</th>
                        <th className="pb-2 font-normal text-right">ACS</th>
                        <th className="pb-2 font-normal text-right">ADR</th>
                        <th className="pb-2 font-normal text-right">K/D</th>
                        <th className="pb-2 font-normal text-right">HS%</th>
                      </tr>
                    </thead>
                    <tbody className="font-data">
                      {(agg as Awaited<ReturnType<typeof getPlayerAggregate>>[]).map((p) => (
                        <tr key={p.playerId} className="border-t border-border-soft">
                          <td className="py-1.5 font-display font-normal tracking-wide">{p.handle}</td>
                          <td className="text-right">{p.avgRating?.toFixed(2) ?? "—"}</td>
                          <td className="text-right">{p.avgAcs?.toFixed(0) ?? "—"}</td>
                          <td className="text-right">{p.avgAdr?.toFixed(0) ?? "—"}</td>
                          <td className="text-right">{p.kd?.toFixed(2) ?? "—"}</td>
                          <td className="text-right">{p.avgHs != null ? `${p.avgHs.toFixed(0)}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            ))}
          </div>

          {/* Agents / compositions */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[{ team: t1!, comp: agentComp1 }, { team: t2!, comp: agentComp2 }].map(({ team, comp }) => (
              <SectionCard key={team.id} title={`Agentes — ${team.name}`}>
                {(comp as Awaited<ReturnType<typeof getAgentComposition>>).length === 0 ? (
                  <p className="text-text-faint text-sm">Sin datos de composiciones todavía.</p>
                ) : (
                  <div className="space-y-2">
                    {(comp as Awaited<ReturnType<typeof getAgentComposition>>).slice(0, 6).map((a) => (
                      <div key={a.agentName} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0 truncate text-text">{a.agentName}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated-2">
                          <div className="h-full bg-team-a" style={{ width: `${a.pickRate * 100}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right font-data text-text-dim">{Math.round(a.pickRate * 100)}%</span>
                        <span className="w-14 shrink-0 text-right font-data text-xs text-text-faint">{a.winRate != null ? `${Math.round(a.winRate * 100)}% WR` : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            ))}
          </div>

          {match.status === "FINAL" && match.evaluation && (
            <SectionCard title="Predicción vs. resultado real" className="mt-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-dim">
                <span>Resultado: <span className="font-data text-text">{match.evaluation.actualScore}</span></span>
                <span>Predicción previa: <span className="font-data text-text">{preMatch?.team1WinProb}% {t1!.name}</span></span>
                <span className={match.evaluation.winnerCorrect ? "text-good" : "text-bad"}>
                  {match.evaluation.winnerCorrect ? "✓ Ganador acertado" : "✗ Ganador fallado"}
                </span>
                {match.evaluation.mapsTotal ? (
                  <span>Mapas acertados: {match.evaluation.mapsCorrect}/{match.evaluation.mapsTotal}</span>
                ) : null}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
