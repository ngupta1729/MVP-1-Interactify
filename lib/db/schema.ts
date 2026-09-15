import { pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * MVP 2 — usage analytics + feedback loop (specs/feedback_loop_spec.md).
 * Everything here is educator-side usage data, not learner data (learners are
 * out of reach - see the spec). Rows are anonymous/pseudonymous by default:
 * `anonUid` is a derived id from the Apps SDK's `openai/subject` (never the
 * raw value - see lib/db/anon.ts), null when the call came from a client
 * that doesn't send one (e.g. Claude Desktop, MCP Inspector).
 */

/**
 * One row per tracked interaction: an export-intent click (Open in H5P
 * player, an h5p.com/Lumi import), or a diff-classified refinement. The
 * "download" event itself is recorded via surveyResponses instead, since
 * Download is gated by the mandatory survey - the survey response *is* the
 * download event, not a separate row.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizToken: text("quiz_token").notNull(),
    eventType: text("event_type").notNull(), // 'click_open_player' | 'click_h5pcom' | 'click_lumi' | 'refinement'
    anonUid: text("anon_uid"),
    // For eventType 'refinement': the diff-classified change (added_question,
    // removed_question, changed_answers, changed_wording, changed_pass_mark,
    // other) and/or the model's own refinementNote, stored as JSON in detail.
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_quiz_token_idx").on(t.quizToken),
    index("events_type_idx").on(t.eventType),
  ],
);

/**
 * One row per (quizToken, anonUid) - see "Embedded satisfaction survey" in
 * specs/feedback_loop_spec.md. A row is a function of CONTENT VERSION, not
 * of session or of ever completing a download: the widget upserts here the
 * moment both required fields (happiness, destination) are set, and again on
 * any later change, so the row always holds the latest answer for that exact
 * quiz content - whether or not download ever actually happens. Completing
 * "Continue to download" fires one more upsert (catches unflushed debounced
 * text) then opens the file; it's a convenience, not the only save point.
 *
 * The (quizToken, anonUid) unique index is what makes the upsert safe: two
 * different people who happen to generate byte-identical content (same
 * token) still get separate rows, but the same person re-answering the same
 * content overwrites their own row instead of duplicating it. Caveat:
 * Postgres never treats two NULLs as equal, so anonymous calls (anonUid
 * null - Claude Desktop, MCP Inspector) get no deduping; each is its own row.
 */
export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizToken: text("quiz_token").notNull(),
    anonUid: text("anon_uid"),
    happiness: text("happiness").notNull(), // 'happy' | 'okay' | 'not_happy'
    destination: text("destination").notNull(), // 'lms' | 'own_site' | 'shared_direct' | 'not_sure' | 'other'
    improvementText: text("improvement_text"), // optional free text, never required
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("survey_token_anon_uid_idx").on(t.quizToken, t.anonUid)],
);
