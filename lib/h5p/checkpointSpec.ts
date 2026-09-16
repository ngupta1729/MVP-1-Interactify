import { z } from "zod";
import { answerSchema } from "./quizSpec";

/**
 * A lightweight interactive "checkpoint" question, embeddable inside a Book
 * chapter or a Video timeline entry. Two types today: Multiple Choice (reuses
 * the same answer shape as the quiz tool) and True/False (simplest H5P
 * question type - a statement plus a yes/no answer).
 */

export const multiChoiceCheckpointSchema = z.object({
  type: z.literal("multichoice"),
  question: z.string().min(1).describe("The question prompt"),
  answers: z
    .array(answerSchema)
    .min(2)
    .max(6)
    .describe("2-6 answer options; at least one must be correct"),
});

export const trueFalseCheckpointSchema = z.object({
  type: z.literal("truefalse"),
  statement: z.string().min(1).describe("The true/false statement shown to the learner"),
  correct: z.boolean().describe("Whether the statement is true"),
  correctFeedback: z.string().optional(),
  incorrectFeedback: z.string().optional(),
});

export const checkpointQuestionSchema = z.discriminatedUnion("type", [
  multiChoiceCheckpointSchema,
  trueFalseCheckpointSchema,
]);

export type MultiChoiceCheckpoint = z.infer<typeof multiChoiceCheckpointSchema>;
export type TrueFalseCheckpoint = z.infer<typeof trueFalseCheckpointSchema>;
export type CheckpointQuestion = z.infer<typeof checkpointQuestionSchema>;

export function validateCheckpoint(cp: CheckpointQuestion): CheckpointQuestion {
  const parsed = checkpointQuestionSchema.parse(cp);
  if (parsed.type === "multichoice" && !parsed.answers.some((a) => a.correct)) {
    throw new Error(`Checkpoint question ("${parsed.question.slice(0, 40)}...") has no correct answer marked.`);
  }
  return parsed;
}
