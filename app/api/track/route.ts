import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * Click-tracking redirect for the h5p.com / Lumi import links (see
 * "Lead-generation signal for h5p.com" in specs/feedback_loop_spec.md).
 * GET /api/track?token=<quiz token>&target=h5pcom|lumi&uid=<anonUid, optional>
 *
 * Logs the click, then 302s to the real destination with a UTM parameter -
 * so total clicks and (where a ChatGPT-derived anonUid is present) unique
 * clickers are both measurable, and the trail exists on our side if a
 * partnership/attribution conversation with H5P ever happens.
 *
 * Never blocks navigation on our own infra: a DB failure here still redirects.
 */
const DESTINATIONS: Record<string, string> = {
  h5pcom: "https://h5p.com",
  lumi: "https://lumi.education",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const target = searchParams.get("target") ?? "";
  const uid = searchParams.get("uid");

  const base = DESTINATIONS[target];
  if (!base || !token) {
    return new Response("Bad tracking link: missing or unknown target/token", { status: 400 });
  }

  try {
    await getDb().insert(events).values({
      quizToken: token,
      eventType: `click_${target}`,
      anonUid: uid || null,
    });
  } catch (err) {
    // Tracking is best-effort - never let a DB hiccup block the educator's click.
    console.error("track: failed to log click", err);
  }

  const dest = new URL(base);
  dest.searchParams.set("utm_source", "interactify");
  dest.searchParams.set("utm_medium", "referral");
  dest.searchParams.set("utm_campaign", "h5p_quiz");
  return NextResponse.redirect(dest.toString(), { status: 302 });
}
