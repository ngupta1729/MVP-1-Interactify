import { NextResponse } from "next/server";
import { checkForHubUpdates, type UpdateCheckResult } from "@/lib/h5p/checkHubUpdates";
import meta from "@/lib/h5p/vendor/h5p-libraries.meta.json";

export const runtime = "nodejs";

/**
 * Vercel Cron hits this on a schedule (see vercel.json) to check whether any
 * of the 3 H5P Hub bundles we vendor from have changed upstream. Detection
 * only - it never touches the vendored zip. Logs the result so it shows up
 * in Vercel's function logs; nothing pages anyone yet, this is meant to be
 * checked by hand (see the "maintaining this app" notes) until there's a
 * reason to wire up an actual notification.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: UpdateCheckResult = await checkForHubUpdates(meta.sources as UpdateCheckResult["baseline"]);

  if (result.changed.length) {
    console.warn(`[check-h5p-updates] ${result.changed.length} H5P Hub source(s) changed since baseline:`, result.changed);
  } else {
    console.log(`[check-h5p-updates] no changes detected (${result.current.length} sources checked)`);
  }

  return NextResponse.json(result);
}
