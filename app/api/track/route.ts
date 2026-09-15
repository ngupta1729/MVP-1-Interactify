import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * The POST handler below is called via fetch() from inside the widget, which
 * runs on a different origin than this app (ChatGPT's sandbox) - that makes
 * it a cross-origin request, and since it sends Content-Type: application/json
 * the browser preflights it with OPTIONS before ever sending the real POST.
 * Without these headers, the preflight fails and the POST is never sent at
 * all - silently, with no error the widget's fire-and-forget fetch() would
 * ever see. Mirrors the player route's existing Access-Control-Allow-Origin.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

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
  dest.searchParams.set("utm_campaign", "interactify");
  return NextResponse.redirect(dest.toString(), { status: 302 });
}

/**
 * Generic click logging for the widget's own buttons (Take the quiz, Answer
 * key, Download, Open in H5P player, Reuse, the H5P logo) - fire-and-forget
 * from lib/h5p/widget.ts, logged the instant the button is clicked and
 * independent of whatever happens after (e.g. Download's click always
 * counts here, even if the mandatory survey is never completed - that's
 * recorded separately in survey_responses, which is a different question).
 * POST /api/track/click  body: { token, eventType, anonUid? }
 */
const CLICK_EVENT_TYPES = new Set([
  "click_take_quiz",
  "click_answer_key",
  "click_download",
  "click_open_player",
  "click_reuse",
  "click_logo",
]);

export async function POST(req: Request) {
  let body: { token?: unknown; eventType?: unknown; anonUid?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false }, { status: 400, headers: CORS_HEADERS });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!token || !CLICK_EVENT_TYPES.has(eventType)) {
    return Response.json({ ok: false }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    await getDb().insert(events).values({
      quizToken: token,
      eventType,
      anonUid: typeof body.anonUid === "string" ? body.anonUid : null,
    });
  } catch (err) {
    console.error("track/click: failed to log", err);
  }
  return Response.json({ ok: true }, { headers: CORS_HEADERS });
}
