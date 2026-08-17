import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { RegionFilterGroup } from "@/components/FilterBar";
import { RegionBadge } from "@/components/RegionBadge";
import { Pagination, parsePage } from "@/components/Pagination";
import type { Region } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function TeamsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const region = (sp.region as Region | undefined) || undefined;
  const page = parsePage(sp);
  const where = { region: region ?? { in: ["AMERICAS", "EMEA", "PACIFIC", "CHINA"] as Region[] } };

  const [teams, ratings, total] = await Promise.all([
    prisma.team.findMany({ where }),
    prisma.teamRating.findMany({ orderBy: { asOf: "desc" }, distinct: ["teamId"] }),
    prisma.team.count({ where }),
  ]);

  const ratingByTeam = new Map(ratings.map((r) => [r.teamId, r.rating]));
  const sorted = [...teams].sort((a, b) => (ratingByTeam.get(b.id) ?? 0) - (ratingByTeam.get(a.id) ?? 0));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Equipos</h1>
      <p className="mt-1 text-sm text-text-dim">{total} equipos detectados automáticamente a partir de los datos de VCT.</p>

      <div className="my-5">
        <RegionFilterGroup base="/teams" current={sp} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {paged.map((team) => (
          <Link key={team.id} href={`/teams/${team.id}`} className="relative overflow-hidden rounded-lg border border-border bg-bg-elevated p-4 text-center transition-colors hover:border-team-a/50">
            {team.logoUrl ? (
              <div className="relative mx-auto h-12 w-12">
                <Image src={team.logoUrl} alt={team.name} fill sizes="48px" className="object-contain" unoptimized referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-bg-elevated-2 font-display text-text-dim">
                {team.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="mt-2 line-clamp-2 font-display text-sm leading-tight tracking-wide">{team.name}</div>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              {team.region && <RegionBadge region={team.region} showLabel={false} />}
              <span className="text-[11px] text-text-faint">{team.region ? team.region : "—"}</span>
            </div>
            {ratingByTeam.has(team.id) && (
              <div className="mt-1 font-data text-xs text-team-b">{Math.round(ratingByTeam.get(team.id)!)} rating</div>
            )}
          </Link>
        ))}
      </div>

      <Pagination base="/teams" current={sp} page={page} totalPages={totalPages} />
    </div>
  );
}
