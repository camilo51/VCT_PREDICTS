/**
 * Thin typed client around the unofficial VLR.gg REST wrapper
 * (https://vlr.orlandomm.net/api/v1 — source: github.com/Orloxx23/vlresports).
 * This is the ONLY external data source for the whole platform.
 * All types below reflect the API's real response shapes (verified live),
 * not the (partially abbreviated) OpenAPI doc.
 */

const BASE = process.env.VLR_API_BASE ?? "https://vlr.orlandomm.net/api/v1";

async function getJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const maxAttempts = 5;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2500 * attempt;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }
      if (!res.ok) throw new Error(`VLR API ${res.status} for ${url.pathname}${url.search}`);
      const json = (await res.json()) as { status: string; size?: number; data: T };
      return json.data;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr;
}

// ---- /events ----
export interface VlrEventListItem {
  id: string;
  name: string;
  status: string;
  prizepool: string;
  dates: string;
  country: string;
  img: string;
}

export interface VlrEventDetail {
  id: string;
  url: string;
  name: string;
  description: string;
  img: string;
  circuit: { name: string; url: string } | null;
  dates: string | null;
  prizepool: string | null;
  location: string | null;
  stages: Array<{ name: string; slug: string | null; dates: string | null; active: boolean; url: string }>;
  teams: Array<{
    id: string;
    url: string;
    name: string;
    logo: string;
    seed: string | null;
    roster: Array<{ id: string; url: string; name: string; flag: string }>;
  }>;
}

export function getEvents(params?: { status?: string; region?: string; tier?: string; page?: number }) {
  return getJson<VlrEventListItem[]>("/events", params);
}

export function getEventDetail(id: string, stage?: string) {
  return getJson<VlrEventDetail>(`/events/${id}`, { stage });
}

export interface VlrEventAgentMap {
  map: string;
  played: number | null;
  atkWinRate: number | null;
  defWinRate: number | null;
  agents: Array<{ name: string; img: string; pickRate: number | null }>;
}

export function getEventAgents(id: string, stage?: string) {
  return getJson<VlrEventAgentMap[]>(`/events/${id}/agents`, { stage });
}

/**
 * Every match belonging to a tracked event (upcoming + completed), not just
 * whatever fits in the global /matches or /results feed's pagination window.
 * We only rely on `.id` here — each id still goes through getMatchDetail for
 * the actual data, so we don't need to trust every field of this list shape.
 */
export function getEventMatches(id: string, stage?: string, status?: string) {
  return getJson<Array<{ id: string }>>(`/events/${id}/matches`, { stage, status });
}

// ---- /matches (upcoming) & /results ----
export interface VlrMatchTeamRef {
  name: string;
  country: string;
  score: string | null;
  id: string;
  logo: string;
  won?: boolean;
}

export interface VlrMatchListItem {
  id: string;
  teams: VlrMatchTeamRef[];
  status: string; // "Upcoming" | "Completed" | "LIVE"
  event: string;
  tournament: string;
  img: string;
  in?: string;
  ago?: string;
  timestamp?: number;
  utcDate?: string;
  utc?: string;
}

export function getUpcomingMatches() {
  return getJson<VlrMatchListItem[]>("/matches");
}

export function getResults(page = 1) {
  return getJson<VlrMatchListItem[]>("/results", { page });
}

// ---- /matches/{id} ----
export interface VlrMatchPlayerStat {
  id: string;
  url: string;
  name: string;
  teamTag: string;
  country: string;
  flag: string;
  agents: Array<{ name: string; img: string }>;
  stats: {
    rating: number | null;
    acs: number | null;
    kills: number | null;
    deaths: number | null;
    assists: number | null;
    kast: number | null;
    adr: number | null;
    hs: number | null;
    firstBloods: number | null;
    firstDeaths: number | null;
  };
}

export interface VlrMatchMap {
  id: string;
  name: string; // map name, or "TBD" if not yet picked
  status: string; // "upcoming" | "live" | "completed"
  pickedBy: string | null; // team name
  duration: string | null;
  teams: Array<{ name: string; score: number | null; roundsCt: number | null; roundsT: number | null }>;
  rounds: unknown[];
  players: VlrMatchPlayerStat[];
}

export interface VlrEconomyBuyStat {
  total: number;
  won: number;
}

export interface VlrMatchEconomy {
  teams: Array<{
    name: string;
    pistolWon: number;
    eco: VlrEconomyBuyStat;
    semiEco: VlrEconomyBuyStat;
    semiBuy: VlrEconomyBuyStat;
    fullBuy: VlrEconomyBuyStat;
  }>;
  rounds: unknown[];
}

export interface VlrMatchDetail {
  id: string;
  url: string;
  event: { id: string; url: string; name: string; series: string; img: string };
  status: string; // "upcoming" | "live" | "final"
  in: string | null;
  format: string;
  date: string;
  time: string;
  timestamp: number;
  utcDate: string;
  teams: Array<{ id: string; url: string; name: string; img: string; score: number | null }>;
  streams: Array<{ name: string; link: string }>;
  vods: Array<{ name: string; link: string }>;
  picksBans: { note: string | null; list: Array<{ type: string; team: string | null; map: string; order?: number }> };
  maps: VlrMatchMap[];
  economy?: VlrMatchEconomy;
}

export function getMatchDetail(id: string, tabs?: "all") {
  return getJson<VlrMatchDetail>(`/matches/${id}`, { tabs });
}

// ---- /teams ----
export interface VlrTeamDetail {
  info: { name: string; tag: string; logo: string };
  players: Array<{ id: string; url: string; user: string; name: string; img: string; country: string }>;
  staff: unknown[];
  inactive: Array<{ id: string; url: string; user: string; name: string; tag: string; img: string; country: string }>;
  events: Array<{ id: string; url: string; name: string; results: string[]; year: string }>;
}

export function getTeamDetail(id: string) {
  return getJson<VlrTeamDetail>(`/teams/${id}`);
}

// ---- /players ----
export interface VlrPlayerDetail {
  info: { id: string; url: string; img: string; user: string; name: string; country: string; flag: string };
  team: { id: string; url: string; name: string; logo: string; joined: string } | null;
  results: Array<{
    match: { id: string; url: string };
    event: { name: string; logo: string };
    teams: Array<{ name: string; tag: string; logo: string; points: string }>;
  }>;
  pastTeams: unknown[];
  socials: unknown;
  timespan: string;
  agents: Array<{
    name: string;
    img: string;
    mapsPlayed: number | null;
    pickRate: number | null;
    rounds: number | null;
    rating: number | null;
    acs: number | null;
    kd: number | null;
    kast: number | null;
    adr: number | null;
    kpr: number | null;
    apr: number | null;
    fkfd: number | null;
  }>;
}

export function getPlayerDetail(id: string, timespan?: "30d" | "60d" | "90d" | "all") {
  return getJson<VlrPlayerDetail>(`/players/${id}`, { timespan });
}
