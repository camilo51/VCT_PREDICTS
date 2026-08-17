"use client";

import { useRouter, usePathname } from "next/navigation";

export function FilterSelect({
  current,
  paramKey,
  options,
  label,
}: {
  current: Record<string, string | undefined>;
  paramKey: string;
  options: { label: string; value: string }[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-xs uppercase tracking-wide text-text-faint">{label}</span>
      <select
        defaultValue={current[paramKey] ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(current)) {
            if (v && k !== paramKey && k !== "page") params.set(k, v);
          }
          if (e.target.value) params.set(paramKey, e.target.value);
          const qs = params.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
        className="rounded-md border border-border bg-bg-elevated-2 px-2.5 py-1.5 text-text focus-visible:outline-team-b"
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
