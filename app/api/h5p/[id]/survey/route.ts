import { z } from "zod";
import { getDb } from "@/lib/db";
import { surveyResponses } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * Called via fetch() from inside the widget, a different origin than this
 * app - the browser preflights this POST (it sends Content-Type: application/
 * json) with OPTIONS before sending it for real. Without these headers the
 * preflight fails and the POST never goes out, silently. Mirrors the player
 * route's existing Access-Control-Allow-Origin.
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
 * POST /api/h5p/{token}/survey — the satisfaction survey (see "Embedded
 * satisfaction survey" in specs/feedback_loop_spec.md). Upserted, not just
 * inserted: the widget calls this the moment both required fields are set,
 * and again on any later change, so this fires many times over one card's
 * life. Keyed by (quizToken, anonUid) - see lib/db/schema.ts for why - so
 * every call after the first just updates that same row to the latest
 * answer, rather than accumulating duplicates.
 *
 * Deliberately NOT about content quality: happiness (holistic), destination
 * (where the educator intends to use it — direct market signal for MVP 3+
 * platform prioritization), and an optional free-text improvement note.
 */
const surveyBody = z.object({
  anonUid: z.string().optional().nullable(),
  happiness: z.enum(["happy", "okay", "not_happy"]),
  destination: z.enum(["lms", "own_site", "shared_direct", "not_sure", "other"]),
  improvementText: z.string().max(1000).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: z.infer<typeof surveyBody>;
  try {
    body = surveyBody.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid survey response." }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    await getDb()
      .insert(surveyResponses)
      .values({
        quizToken: id,
        anonUid: body.anonUid || null,
        happiness: body.happiness,
        destination: body.destination,
        improvementText: body.improvementText || null,
      })
      .onConflictDoUpdate({
        target: [surveyResponses.quizToken, surveyResponses.anonUid],
        set: {
          happiness: body.happiness,
          destination: body.destination,
          improvementText: body.improvementText || null,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    // A DB hiccup shouldn't block the widget - log it for us to notice.
    console.error("survey: failed to record response", err);
    return Response.json({ ok: true, recorded: false }, { headers: CORS_HEADERS });
  }

  return Response.json({ ok: true, recorded: true }, { headers: CORS_HEADERS });
}
