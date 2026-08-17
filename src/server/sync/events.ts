import { prisma } from "@/lib/prisma";
import { getEventDetail, getEvents, type VlrEventListItem } from "@/server/vlr/client";
import { regionFromEventName, isTrackedVctEvent } from "@/lib/region";
import { forEachThrottled } from "./util";

async function collectCandidateEvents(): Promise<VlrEventListItem[]> {
  const byId = new Map<string, VlrEventListItem>();

  for (const status of ["ongoing", "upcoming"]) {
    try {
      const page = await getEvents({ status });
      for (const e of page) byId.set(e.id, e);
    } catch (err) {
      console.error(`[sync:events] failed to list status=${status}:`, err instanceof Error ? err.message : err);
    }
  }

  // "completed" is paginated across the whole VLR event history. A deep scan
  // is only useful for the one-time historical backfill — regular cron ticks
  // just need the most recent pages to catch a stage that just wrapped up,
  // so they stay well under the workflow's time budget. Override via
  // SYNC_COMPLETED_PAGES for an occasional deeper manual backfill.
  const maxCompletedPages = Number(process.env.SYNC_COMPLETED_PAGES) || 3;
  for (let page = 1; page <= maxCompletedPages; page++) {
    try {
      const items = await getEvents({ status: "completed", page });
      if (items.length === 0) break;
      for (const e of items) byId.set(e.id, e);
    } catch (err) {
      console.error(`[sync:events] failed to list status=completed page=${page}:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  return [...byId.values()].filter((e) => regionFromEventName(e.name));
}

export async function syncEvents() {
  const candidates = await collectCandidateEvents();
  let synced = 0;

  await forEachThrottled(candidates, 700, async (item) => {
    const detail = await getEventDetail(item.id);
    if (!isTrackedVctEvent(detail.name, detail.circuit?.name)) return;
    const region = regionFromEventName(detail.name);
    if (!region) return;

    await prisma.event.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: detail.name,
        region,
        circuitName: detail.circuit?.name ?? null,
        description: detail.description ?? null,
        imgUrl: detail.img ?? null,
        prizepool: detail.prizepool ?? null,
        datesText: detail.dates ?? null,
        location: detail.location ?? null,
        status: item.status ?? null,
        sourceUrl: detail.url ?? null,
      },
      update: {
        name: detail.name,
        region,
        circuitName: detail.circuit?.name ?? null,
        description: detail.description ?? null,
        imgUrl: detail.img ?? null,
        prizepool: detail.prizepool ?? null,
        datesText: detail.dates ?? null,
        location: detail.location ?? null,
        status: item.status ?? null,
        sourceUrl: detail.url ?? null,
      },
    });

    for (const stage of detail.stages) {
      await prisma.stage.upsert({
        where: { eventId_name: { eventId: item.id, name: stage.name } },
        create: {
          eventId: item.id,
          name: stage.name,
          slug: stage.slug,
          datesText: stage.dates,
          active: stage.active,
        },
        update: { slug: stage.slug, datesText: stage.dates, active: stage.active },
      });
    }

    for (const team of detail.teams) {
      if (!team.id) continue; // unresolved bracket slot ("TBD") has no stable id

      await prisma.team.upsert({
        where: { id: team.id },
        create: {
          id: team.id,
          name: team.name,
          logoUrl: team.logo ?? null,
          region,
          sourceUrl: team.url ?? null,
        },
        update: {
          name: team.name,
          logoUrl: team.logo ?? null,
          region,
        },
      });

      await prisma.eventTeam.upsert({
        where: { eventId_teamId: { eventId: item.id, teamId: team.id } },
        create: { eventId: item.id, teamId: team.id, seed: team.seed ?? null },
        update: { seed: team.seed ?? null },
      });

      for (const p of team.roster) {
        if (!p.id) continue;
        await prisma.player.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            handle: p.name,
            country: p.flag ?? null,
            currentTeamId: team.id,
            sourceUrl: p.url ?? null,
          },
          update: {
            handle: p.name,
            country: p.flag ?? null,
            currentTeamId: team.id,
          },
        });
      }
    }

    synced++;
  });

  return { synced, candidates: candidates.length };
}
