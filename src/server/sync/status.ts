import type { MapStatus, MatchStatus } from "@prisma/client";

export function toMatchStatus(raw: string): MatchStatus {
  const s = raw.toLowerCase();
  if (s === "live") return "LIVE";
  if (s === "upcoming") return "UPCOMING";
  return "FINAL";
}

export function toMapStatus(raw: string | null | undefined): MapStatus {
  const s = (raw ?? "").toLowerCase();
  if (s === "live" || s === "live!") return "LIVE";
  if (s === "completed" || s === "complete" || s === "final") return "COMPLETED";
  return "UPCOMING";
}
