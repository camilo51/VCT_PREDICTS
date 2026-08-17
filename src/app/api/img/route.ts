import { NextRequest } from "next/server";

/**
 * Proxies team/player logo images from VLR's CDN.
 *
 * owcdn.net blocks any request whose `Sec-Fetch-Site` header is `cross-site`
 * (a browser-mandated header that can't be suppressed via referrerPolicy or
 * any client-side trick) — so the browser can never fetch these images
 * directly from our domain. Fetching them server-side sidesteps that: a
 * server-to-server fetch doesn't carry Sec-Fetch-* headers at all, and the
 * browser only ever talks to our own origin.
 */
const ALLOWED_HOSTS = new Set(["owcdn.net", "www.vlr.gg", "vlr.gg"]);

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response("Host not allowed", { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { "user-agent": "Mozilla/5.0 (compatible; VCTPredicts/1.0)" },
    next: { revalidate: 86400 },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
