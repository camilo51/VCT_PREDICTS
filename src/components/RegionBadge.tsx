import type { Region } from "@prisma/client";
import { REGION_LABEL, REGION_COLOR } from "@/lib/region";

export function RegionBadge({ region, showLabel = true }: { region: Region; showLabel?: boolean }) {
  const color = REGION_COLOR[region];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {showLabel && REGION_LABEL[region]}
    </span>
  );
}

/** Thin colored strip used as a left accent on cards/rows to make region scannable at a glance. */
export function RegionStripe({ region }: { region: Region }) {
  return <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg" style={{ backgroundColor: REGION_COLOR[region] }} />;
}
