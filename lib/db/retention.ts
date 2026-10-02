import { lt } from "drizzle-orm";
import { getDb } from "./index";
import { events, surveyResponses } from "./schema";

/**
 * Makes the privacy policy's retention claim true rather than aspirational.
 * Both tables hold pseudonymous personal data (anon_uid lets us single out
 * one person's activity across events, even without a name - see the GDPR
 * discussion that led to this) - GDPR's storage limitation principle (Art.
 * 5(1)(e)) means we shouldn't keep it longer than the stated purpose needs.
 * 12 months is a product choice, not a legal minimum - change RETENTION_MONTHS
 * and the policy text together if that changes.
 */
export const RETENTION_MONTHS = 12;

export interface RetentionResult {
  cutoff: string;
  eventsDeleted: number;
  surveyResponsesDeleted: number;
}

export async function deleteExpiredData(retentionMonths = RETENTION_MONTHS): Promise<RetentionResult> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);

  const [deletedEvents, deletedSurveys] = await Promise.all([
    getDb().delete(events).where(lt(events.createdAt, cutoff)).returning({ id: events.id }),
    getDb().delete(surveyResponses).where(lt(surveyResponses.createdAt, cutoff)).returning({ id: surveyResponses.id }),
  ]);

  return {
    cutoff: cutoff.toISOString(),
    eventsDeleted: deletedEvents.length,
    surveyResponsesDeleted: deletedSurveys.length,
  };
}
