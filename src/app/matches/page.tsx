import Link from "next/link";
import { listMatches, countMatches, listDistinctTournaments } from "@/server/data/matches";
import { MatchCard } from "@/components/MatchCard";
import { RegionFilterGroup } from "@/components/FilterBar";
import { FilterSelect } from "@/components/FilterSelect";
import { Pagination, parsePage } from "@/components/Pagination";
import type { Region } from "@prisma/client";

export const dynamic = "force-dynamic";

const TABS = [
  { label: "Próximos", value: "upcoming" },
  { label: "En vivo", value: "live" },
  { label: "Finalizados", value: "completed" },
];

const PAGE_SIZE = 12;

export default async function MatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "upcoming";
  const region = (sp.region as Region | undefined) || undefined;
  const eventId = sp.event || undefined;
  const page = parsePage(sp);

  const status = tab === "live" ? (["LIVE"] as const) : tab === "completed" ? (["FINAL"] as const) : (["UPCOMING"] as const);
  const filters = { status: [...status], region, eventId };

  const [matches, total, tournaments] = await Promise.all([
    listMatches({ ...filters, page, pageSize: PAGE_SIZE }),
    countMatches(filters),
    listDistinctTournaments(region),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tournamentOptions = [{ label: "Todos los torneos", value: "" }, ...tournaments.map((t) => ({ label: t.name, value: t.id }))];

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Partidos</h1>
      <p className="mt-1 text-sm text-text-dim">{total} partidos {tab === "upcoming" ? "próximos" : tab === "live" ? "en vivo" : "finalizados"}.</p>

      <div className="mt-4 flex gap-1.5 border-b border-border">
        {TABS.map((t) => {
          const params = new URLSearchParams({ ...(region ? { region } : {}), ...(eventId ? { event: eventId } : {}), tab: t.value });
          const active = t.value === tab;
          return (
            <Link
              key={t.value}
              href={`/matches?${params.toString()}`}
              className={`px-4 py-2 text-sm font-medium ${active ? "border-b-2 border-team-a text-text" : "text-text-dim hover:text-text"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="my-5 flex flex-col gap-4 rounded-lg border border-border-soft bg-bg-elevated/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <RegionFilterGroup base="/matches" current={{ ...sp, tab }} />
        <FilterSelect current={{ ...sp, tab }} paramKey="event" options={tournamentOptions} label="Torneo" />
      </div>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-text-faint">
          No hay partidos que coincidan con estos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      <Pagination base="/matches" current={{ ...sp, tab }} page={page} totalPages={totalPages} />
    </div>
  );
}
