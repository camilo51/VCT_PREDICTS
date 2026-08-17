export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run async tasks sequentially with a fixed delay between each, to be gentle on the unofficial upstream API. */
export async function forEachThrottled<T>(items: T[], delayMs: number, fn: (item: T, index: number) => Promise<void>) {
  for (let i = 0; i < items.length; i++) {
    try {
      await fn(items[i], i);
    } catch (err) {
      console.error(`[sync] item ${i} failed:`, err instanceof Error ? err.message : err);
    }
    if (i < items.length - 1) await sleep(delayMs);
  }
}
