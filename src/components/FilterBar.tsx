import Link from "next/link";
import type { Region } from "@prisma/client";
import { REGION_COLOR, REGION_LABEL } from "@/lib/region";

export interface FilterOption {
  label: string;
  value: string;
}

function buildHref(base: string, current: Record<string, string | undefined>, key: string, value: string) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== key && k !== "page") params.set(k, v);
  }
  if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function FilterGroup({
  base,
  current,
  paramKey,
  options,
  label,
}: {
  base: string;
  current: Record<string, string | undefined>;
  paramKey: string;
  options: FilterOption[];
  label: string;
}) {
  const activeValue = current[paramKey] ?? "";
  return (
    <div>
      {label && <div className="mb-2 text-xs uppercase tracking-wide text-text-faint">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt.value === activeValue;
          return (
            <Link
              key={opt.value || "all"}
              href={buildHref(base, current, paramKey, opt.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-team-a bg-team-a/10 text-team-a"
                  : "border-border-soft text-text-dim hover:border-text-faint hover:text-text"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Region filter as colored pills, matching the per-region accent used on match cards. */
export function RegionFilterGroup({
  base,
  current,
  label = "Región",
}: {
  base: string;
  current: Record<string, string | undefined>;
  label?: string;
}) {
  const activeValue = (current.region as Region | undefined) ?? "";
  const regions: Region[] = ["AMERICAS", "EMEA", "PACIFIC", "CHINA", "INTERNATIONAL"];

  return (
    <div>
      {label && <div className="mb-2 text-xs uppercase tracking-wide text-text-faint">{label}</div>}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref(base, current, "region", "")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeValue === "" ? "border-team-a bg-team-a/10 text-team-a" : "border-border-soft text-text-dim hover:border-text-faint hover:text-text"
          }`}
        >
          Todas
        </Link>
        {regions.map((r) => {
          const active = r === activeValue;
          const color = REGION_COLOR[r];
          return (
            <Link
              key={r}
              href={buildHref(base, current, "region", r)}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: active ? color : "var(--border-soft)",
                backgroundColor: active ? `color-mix(in srgb, ${color} 15%, transparent)` : "transparent",
                color: active ? color : "var(--text-dim)",
              }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {REGION_LABEL[r]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
