import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

/**
 * There's no per-generation cost we're exposed to (ChatGPT's own model does
 * the reasoning; we just package H5P files), so this isn't about protecting
 * a metered API bill. It's about one scripted/abusive anonUid hammering our
 * Vercel functions and Neon DB enough to trip free-tier limits or degrade
 * the experience for everyone else. A generous per-user cap is enough for
 * that - it's not trying to police normal heavy iteration.
 *
 * Window and limit are deliberately simple (one rolling window, one
 * threshold) rather than a tiered scheme - easy to reason about and to
 * tighten later if real abuse shows a different pattern.
 */
const WINDOW_MINUTES = 60;
const MAX_GENERATIONS_PER_WINDOW = 30;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  windowMinutes: number;
}

/**
 * anonUid is only ever set for Apps SDK calls (see deriveAnonUid) - clients
 * with no identity signal (Claude Desktop, MCP Inspector) aren't rate
 * limited at all, since there's no reliable signal to key on and these have
 * historically been low-volume dev/testing contexts, not the abuse vector
 * this guards against.
 */
export async function checkGenerationRateLimit(anonUid: string | null): Promise<RateLimitResult> {
  if (!anonUid) {
    return { allowed: true, count: 0, limit: MAX_GENERATIONS_PER_WINDOW, windowMinutes: WINDOW_MINUTES };
  }

  // Fails OPEN, not closed: if the DB is unreachable (e.g. a suspended Neon
  // project past its free-tier cap), generation should still work - the same
  // "never let a DB hiccup block the educator" rule every other DB call in
  // this app follows. Worst case here is a burst goes uncounted, which is far
  // better than the app going down the moment analytics/rate-limiting breaks.
  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(
        and(
          eq(events.anonUid, anonUid),
          inArray(events.eventType, ["generate", "refinement"]),
          gte(events.createdAt, since),
        ),
      );

    const count = row?.count ?? 0;
    return {
      allowed: count < MAX_GENERATIONS_PER_WINDOW,
      count,
      limit: MAX_GENERATIONS_PER_WINDOW,
      windowMinutes: WINDOW_MINUTES,
    };
  } catch (err) {
    console.error("checkGenerationRateLimit: DB unreachable, failing open", err);
    return { allowed: true, count: 0, limit: MAX_GENERATIONS_PER_WINDOW, windowMinutes: WINDOW_MINUTES };
  }
}
