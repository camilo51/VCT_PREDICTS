import Link from "next/link";
import { listPlayerLeaderboard } from "@/server/data/insights";
import { RegionFilterGroup } from "@/components/FilterBar";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination, parsePage } from "@/components/Pagination";
import { REGION_LABEL } from "@/lib/region";
import type { Region } from "@prisma/client";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = [
  { label: "Rating", value: "rating" },
  { label: "ACS", value: "acs" },
  { label: "K/D", value: "kd" },
  { label: "ADR", value: "adr" },
];

const PAGE_SIZE = 25;

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const region = (sp.region as Region | undefined) || undefined;
  const sort = sp.sort ?? "rating";
  const page = parsePage(sp);

  const all = await listPlayerLeaderboard();
  const filtered = region ? all.filter((p) => p.region === region) : all;
  const sortKey = sort === "acs" ? "avgAcs" : sort === "kd" ? "kd" : sort === "adr" ? "avgAdr" : "avgRating";
  const sorted = [...filtered].sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Jugadores</h1>
      <p className="mt-1 text-sm text-text-dim">{filtered.length} jugadores con datos registrados.</p>

      <div className="my-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <RegionFilterGroup base="/players" current={sp} />
        <FilterSelect current={sp} paramKey="sort" options={SORT_OPTIONS} label="Ordenar por" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated-2">
            <tr className="text-left text-[11px] uppercase text-text-faint">
              <th className="px-3 py-2 font-normal">Jugador</th>
              <th className="px-3 py-2 font-normal">Equipo</th>
              <th className="px-3 py-2 font-normal">Región</th>
              <th className="px-3 py-2 font-normal text-right">Rating</th>
              <th className="px-3 py-2 font-normal text-right">ACS</th>
              <th className="px-3 py-2 font-normal text-right">ADR</th>
              <th className="px-3 py-2 font-normal text-right">K/D</th>
              <th className="px-3 py-2 font-normal text-right">Mapas</th>
            </tr>
          </thead>
          <tbody className="font-data">
            {paged.map((p) => (
              <tr key={p.playerId} className="border-t border-border-soft hover:bg-bg-elevated/60">
                <td className="px-3 py-2 font-display font-normal tracking-wide">
                  <Link href={`/players/${p.playerId}`} className="hover:text-team-a">{p.handle}</Link>
                </td>
                <td className="px-3 py-2 text-text-dim">{p.teamName ?? "—"}</td>
                <td className="px-3 py-2 text-text-dim">{p.region ? REGION_LABEL[p.region as Region] : "—"}</td>
                <td className="px-3 py-2 text-right">{p.avgRating?.toFixed(2) ?? "—"}</td>
                <td className="px-3 py-2 text-right">{p.avgAcs?.toFixed(0) ?? "—"}</td>
                <td className="px-3 py-2 text-right">{p.avgAdr?.toFixed(0) ?? "—"}</td>
                <td className="px-3 py-2 text-right">{p.kd?.toFixed(2) ?? "—"}</td>
                <td className="px-3 py-2 text-right text-text-faint">{p.mapsPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination base="/players" current={sp} page={page} totalPages={totalPages} />
    </div>
  );
}
