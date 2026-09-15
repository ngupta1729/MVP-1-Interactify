import type { QuizSpec } from "./quizSpec";

/**
 * Objective, structural classification of what changed between two versions
 * of "the same" quiz - see "Understanding refinement patterns" in
 * specs/feedback_loop_spec.md. No access to the chat that caused the change,
 * only the before/after spec - deliberately mechanical, not a "why".
 */
export type RefinementKind =
  | "added_question"
  | "removed_question"
  | "changed_wording"
  | "changed_answers"
  | "changed_pass_mark"
  | "changed_title"
  | "other";

export function classifyRefinement(prev: QuizSpec, next: QuizSpec): RefinementKind[] {
  const kinds = new Set<RefinementKind>();

  if (next.questions.length > prev.questions.length) kinds.add("added_question");
  if (next.questions.length < prev.questions.length) kinds.add("removed_question");
  if (prev.title !== next.title) kinds.add("changed_title");
  if (prev.passPercentage !== next.passPercentage) kinds.add("changed_pass_mark");

  const overlap = Math.min(prev.questions.length, next.questions.length);
  for (let i = 0; i < overlap; i++) {
    const a = prev.questions[i];
    const b = next.questions[i];
    if (a.question !== b.question) kinds.add("changed_wording");
    const aAnswers = a.answers.map((x) => `${x.text}|${x.correct}`).join(",");
    const bAnswers = b.answers.map((x) => `${x.text}|${x.correct}`).join(",");
    if (aAnswers !== bAnswers) kinds.add("changed_answers");
  }

  if (kinds.size === 0) kinds.add("other");
  return Array.from(kinds);
}
