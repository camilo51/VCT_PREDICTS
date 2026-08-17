import Link from "next/link";

function hrefFor(base: string, current: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== "page") params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function Pagination({
  base,
  current,
  page,
  totalPages,
}: {
  base: string;
  current: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="mt-6 flex items-center justify-center gap-3 text-sm">
      <Link
        href={hrefFor(base, current, page - 1)}
        aria-disabled={prevDisabled}
        className={`rounded-md border px-3 py-1.5 transition-colors ${
          prevDisabled ? "pointer-events-none border-border-soft text-text-faint" : "border-border text-text-dim hover:border-team-a/50 hover:text-text"
        }`}
      >
        ← Anterior
      </Link>
      <span className="font-data text-text-dim">
        Página {page} de {totalPages}
      </span>
      <Link
        href={hrefFor(base, current, page + 1)}
        aria-disabled={nextDisabled}
        className={`rounded-md border px-3 py-1.5 transition-colors ${
          nextDisabled ? "pointer-events-none border-border-soft text-text-faint" : "border-border text-text-dim hover:border-team-a/50 hover:text-text"
        }`}
      >
        Siguiente →
      </Link>
    </nav>
  );
}

export function parsePage(sp: Record<string, string | undefined>): number {
  const n = Number(sp.page);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
