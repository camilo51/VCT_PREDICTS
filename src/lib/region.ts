import type { Region } from "@prisma/client";

/**
 * Determine VCT region from an event/tournament name.
 * Returns null when the event is not part of the VCT ecosystem we track
 * (e.g. Game Changers, Challengers-only regions, other titles).
 */
export function regionFromEventName(name: string): Region | null {
  const n = name.toLowerCase();

  if (/\bvct\b/.test(n)) {
    if (n.includes("americas")) return "AMERICAS";
    if (n.includes("emea")) return "EMEA";
    if (n.includes("pacific")) return "PACIFIC";
    if (n.includes("china")) return "CHINA";
    // "VCT 2026: Kickoff" style names without a region are international
    return "INTERNATIONAL";
  }

  if (/valorant masters/.test(n) || /valorant champions\b/.test(n) || /^champions\b/.test(n)) {
    return "INTERNATIONAL";
  }

  return null;
}

export function isTrackedVctEvent(name: string, circuitName?: string | null): boolean {
  if (regionFromEventName(name)) return true;
  if (circuitName && /valorant champions tour/i.test(circuitName)) return true;
  return false;
}

export const REGION_LABEL: Record<Region, string> = {
  AMERICAS: "Americas",
  EMEA: "EMEA",
  PACIFIC: "Pacific",
  CHINA: "China",
  INTERNATIONAL: "International",
};

/** Region accent colors — CSS var tokens defined in globals.css, used for quick visual scanning. */
export const REGION_COLOR: Record<Region, string> = {
  AMERICAS: "var(--region-americas)",
  EMEA: "var(--region-emea)",
  PACIFIC: "var(--region-pacific)",
  CHINA: "var(--region-china)",
  INTERNATIONAL: "var(--region-international)",
};

export const REGION_TEXT_CLASS: Record<Region, string> = {
  AMERICAS: "text-region-americas",
  EMEA: "text-region-emea",
  PACIFIC: "text-region-pacific",
  CHINA: "text-region-china",
  INTERNATIONAL: "text-region-international",
};
