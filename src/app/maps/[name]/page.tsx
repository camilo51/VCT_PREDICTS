import Link from "next/link";
import { notFound } from "next/navigation";
import { getMapDetail } from "@/server/data/maps";
import { SectionCard } from "@/components/SectionCard";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MapDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const mapName = decodeURIComponent(name);
  const { overview, topTeams, topPlayers, totalMaps } = await getMapDetail(mapName);
  if (!overview && totalMaps === 0) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
      <Link href="/maps" className="mb-4 inline-block text-xs text-text-faint hover:text-text-dim">← Todos los mapas</Link>

      <header className="rounded-lg border border-border bg-bg-elevated p-6">
        <h1 className="font-display text-2xl tracking-wide sm:text-3xl">{mapName}</h1>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Jugados" value={String(overview?.played ?? totalMaps)} />
          <Stat label="Pick rate" value={pct(overview?.pickRate ?? null)} />
          <Stat label="Ban rate" value={pct(overview?.banRate ?? null)} />
          <Stat label="Attack / Defense" value={`${pct(overview?.atkWinRate ?? null)} / ${pct(overview?.defWinRate ?? null)}`} />
        </div>
      </header>

      <SectionCard title="Equipos que mejor lo juegan" className="mt-4">
        {topTeams.length === 0 ? (
          <p className="text-sm text-text-faint">Todavía no hay suficientes partidos en este mapa.</p>
        ) : (
          <ol className="space-y-2">
            {topTeams.map((t, i) => (
              <li key={t.teamId} className="flex items-center justify-between text-sm">
                <span><Link href={`/teams/${t.teamId}`} className="hover:text-team-a">{i + 1}. {t.teamName}</Link></span>
                <span className="font-data text-text-dim">{t.wins}-{t.played - t.wins} · {pct(t.winRate)}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard title="Jugadores con mejor rendimiento" className="mt-4">
        {topPlayers.length === 0 ? (
          <p className="text-sm text-text-faint">Todavía no hay suficientes datos de jugadores en este mapa.</p>
        ) : (
          <ol className="space-y-2">
            {topPlayers.map((p, i) => (
              <li key={p.playerId} className="flex items-center justify-between text-sm">
                <span><Link href={`/players/${p.playerId}`} className="hover:text-team-a">{i + 1}. {p.handle}</Link></span>
                <span className="font-data text-text-dim">{p.avgRating.toFixed(2)} rating · {p.mapsPlayed} mapas</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-faint">{label}</div>
      <div className="font-data text-lg text-text">{value}</div>
    </div>
  );
}
