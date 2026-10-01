import { z } from "zod";

/**
 * H5P.SingleChoiceSet: a sequence of single-answer questions that
 * auto-advance on a correct pick. By H5P.SingleChoiceSet's own convention
 * (verified against h5p/h5p-single-choice-set's scripts/single-choice.js:
 * `correct: i === 0`), the FIRST answer in each question's list is always
 * the correct one - the runtime shuffles display order itself.
 */

export const choiceQuestionSchema = z.object({
  question: z.string().min(1).max(300).describe("The question text"),
  answers: z
    .array(z.string().min(1).max(150))
    .min(2)
    .max(6)
    .describe("Answer options - the FIRST item must be the correct answer; the rest are distractors. The runtime shuffles display order."),
});

export const singlechoicesetSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Activity title"),
  choices: z.array(choiceQuestionSchema).min(1).max(20).describe("The questions, shown one at a time"),
});

export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type SinglechoicesetSpec = z.infer<typeof singlechoicesetSpecSchema>;

export const singlechoicesetSpecShape = singlechoicesetSpecSchema.shape;

export function validateSinglechoiceset(spec: SinglechoicesetSpec): SinglechoicesetSpec {
  return singlechoicesetSpecSchema.parse(spec);
}
