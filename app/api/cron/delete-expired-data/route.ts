import { NextResponse } from "next/server";
import { deleteExpiredData, RETENTION_MONTHS } from "@/lib/db/retention";

export const runtime = "nodejs";

/**
 * Vercel Cron hits this daily to enforce the retention period stated in the
 * privacy policy (currently 12 months) on `events` and `survey_responses` -
 * both hold pseudonymous personal data (anon_uid), so GDPR's storage
 * limitation principle applies. Without this running for real, the policy's
 * retention claim would just be a promise nothing actually enforces.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await deleteExpiredData();
  console.log(
    `[delete-expired-data] retention=${RETENTION_MONTHS}mo cutoff=${result.cutoff} ` +
      `events=${result.eventsDeleted} surveyResponses=${result.surveyResponsesDeleted}`,
  );

  return NextResponse.json(result);
}
