import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RegionFilterGroup } from "@/components/FilterBar";
import { RegionBadge } from "@/components/RegionBadge";
import { Pagination, parsePage } from "@/components/Pagination";
import type { Region } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const region = (sp.region as Region | undefined) || undefined;
  const page = parsePage(sp);
  const where = region ? { region } : undefined;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastSyncedAt: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.event.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <h1 className="font-display text-2xl tracking-wide sm:text-3xl">Torneos</h1>
      <p className="mt-1 text-sm text-text-dim">{total} temporadas y torneos de VCT detectados automáticamente.</p>

      <div className="my-5">
        <RegionFilterGroup base="/tournaments" current={sp} />
      </div>

      <div className="space-y-3">
        {events.map((e) => (
          <Link key={e.id} href={`/tournaments/${e.id}`} className="relative flex items-center justify-between overflow-hidden rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-team-a/50">
            <div>
              <div className="flex items-center gap-2">
                <RegionBadge region={e.region} showLabel={false} />
                <span className="font-display text-lg tracking-wide">{e.name}</span>
              </div>
              <div className="mt-1 text-xs text-text-faint">{e.datesText ?? "Fechas por confirmar"}</div>
            </div>
            <div className="text-right text-sm text-text-dim">
              {e.prizepool && <div className="font-data">{e.prizepool}</div>}
              <div className="text-xs uppercase text-text-faint">{e.status}</div>
            </div>
          </Link>
        ))}
        {events.length === 0 && <p className="text-text-faint">Sin torneos sincronizados todavía.</p>}
      </div>

      <Pagination base="/tournaments" current={sp} page={page} totalPages={totalPages} />
    </div>
  );
}
