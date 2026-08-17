import cron from "node-cron";
import { runFullSync } from "./run";

const SCHEDULE = process.env.SYNC_CRON ?? "*/10 * * * *"; // every 10 minutes by default

console.log(`[sync:watch] scheduling full sync with cron "${SCHEDULE}"`);

let running = false;
async function tick() {
  if (running) {
    console.log("[sync:watch] previous run still in progress, skipping this tick");
    return;
  }
  running = true;
  try {
    await runFullSync();
  } catch (err) {
    console.error("[sync:watch] run failed:", err);
  } finally {
    running = false;
  }
}

cron.schedule(SCHEDULE, tick);
tick(); // run once immediately on startup
