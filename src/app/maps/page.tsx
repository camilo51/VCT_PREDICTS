import Link from "next/link";
import { listMapsOverview } from "@/server/data/maps";
import { pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const maps = await listMapsOverview();

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Mapas</h1>
      <p className="mt-1 text-sm text-text-dim">Estadísticas agregadas de todos los mapas jugados en VCT registrados por la plataforma.</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {maps.map((m) => (
          <Link key={m.mapName} href={`/maps/${encodeURIComponent(m.mapName)}`} className="rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-team-a/50">
            <div className="font-display text-lg tracking-wide">{m.mapName}</div>
            <div className="mt-2 space-y-1 text-sm text-text-dim">
              <div className="flex justify-between"><span>Jugados</span><span className="font-data text-text">{m.played}</span></div>
              <div className="flex justify-between"><span>Pick rate</span><span className="font-data text-text">{pct(m.pickRate)}</span></div>
              <div className="flex justify-between"><span>Ban rate</span><span className="font-data text-text">{pct(m.banRate)}</span></div>
              <div className="flex justify-between"><span>Attack / Defense</span><span className="font-data text-text">{pct(m.atkWinRate)} / {pct(m.defWinRate)}</span></div>
            </div>
          </Link>
        ))}
        {maps.length === 0 && <p className="text-text-faint">Sin datos de mapas todavía.</p>}
      </div>
    </div>
  );
}
