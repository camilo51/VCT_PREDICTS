import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SectionCard } from "@/components/SectionCard";
import { MatchCard } from "@/components/MatchCard";
import { REGION_LABEL } from "@/lib/region";
import { proxiedLogo } from "@/lib/image";

export const dynamic = "force-dynamic";

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      stages: true,
      participants: { include: { team: true } },
      matches: {
        include: {
          event: true,
          stage: true,
          team1: true,
          team2: true,
          maps: { orderBy: { orderIndex: "asc" } },
          predictions: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { scheduledAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const upcoming = event.matches.filter((m) => m.status === "UPCOMING");
  const live = event.matches.filter((m) => m.status === "LIVE");
  const finished = event.matches.filter((m) => m.status === "FINAL");

  // Lightweight standings: series W-L within this event.
  const standings = new Map<string, { name: string; w: number; l: number }>();
  for (const m of finished) {
    if (!m.team1Id || !m.team2Id || m.team1Score == null || m.team2Score == null) continue;
    const t1 = standings.get(m.team1Id) ?? { name: m.team1?.name ?? "?", w: 0, l: 0 };
    const t2 = standings.get(m.team2Id) ?? { name: m.team2?.name ?? "?", w: 0, l: 0 };
    if (m.team1Score > m.team2Score) { t1.w++; t2.l++; } else { t2.w++; t1.l++; }
    standings.set(m.team1Id, t1);
    standings.set(m.team2Id, t2);
  }
  const standingsRows = [...standings.entries()].sort((a, b) => b[1].w - a[1].w || a[1].l - b[1].l);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <Link href="/tournaments" className="mb-4 inline-block text-xs text-text-faint hover:text-text-dim">← Todos los torneos</Link>

      <header className="rounded-lg border border-border bg-bg-elevated p-6">
        <h1 className="font-display text-2xl tracking-wide sm:text-3xl">{event.name}</h1>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-text-dim">
          <span>{REGION_LABEL[event.region]}</span>
          {event.datesText && <span>{event.datesText}</span>}
          {event.prizepool && <span className="font-data">{event.prizepool}</span>}
          {event.location && <span>{event.location}</span>}
        </div>
        {event.stages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {event.stages.map((s) => (
              <span key={s.id} className={`rounded-full border px-2.5 py-0.5 text-xs ${s.active ? "border-team-a text-team-a" : "border-border text-text-faint"}`}>
                {s.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Equipos participantes" className="lg:col-span-1">
          <ul className="space-y-1.5">
            {event.participants.map((p) => (
              <li key={p.id}>
                <Link href={`/teams/${p.team.id}`} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-bg-elevated-2">
                  {p.team.logoUrl && <Image src={proxiedLogo(p.team.logoUrl)!} alt="" width={18} height={18} unoptimized className="object-contain" />}
                  <span>{p.team.name}</span>
                  {p.seed && <span className="ml-auto text-xs text-text-faint">{p.seed}</span>}
                </Link>
              </li>
            ))}
            {event.participants.length === 0 && <p className="text-sm text-text-faint">Sin equipos registrados todavía.</p>}
          </ul>
        </SectionCard>

        <SectionCard title="Clasificación" className="lg:col-span-2">
          {standingsRows.length === 0 ? (
            <p className="text-sm text-text-faint">Todavía no hay resultados suficientes para una clasificación.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-text-faint">
                  <th className="pb-2 font-normal">Equipo</th>
                  <th className="pb-2 font-normal text-right">V</th>
                  <th className="pb-2 font-normal text-right">D</th>
                </tr>
              </thead>
              <tbody className="font-data">
                {standingsRows.map(([teamId, s]) => (
                  <tr key={teamId} className="border-t border-border-soft">
                    <td className="py-1.5 font-display font-normal tracking-wide"><Link href={`/teams/${teamId}`} className="hover:text-team-a">{s.name}</Link></td>
                    <td className="py-1.5 text-right text-good">{s.w}</td>
                    <td className="py-1.5 text-right text-bad">{s.l}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {[{ title: "En vivo", list: live }, { title: "Próximos partidos", list: upcoming }, { title: "Resultados", list: finished }].map(
        ({ title, list }) =>
          list.length > 0 && (
            <section key={title} className="mt-6">
              <h2 className="mb-3 font-display text-lg tracking-wide">{title}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}
