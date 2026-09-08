import { z } from "zod";

/**
 * The quiz structure this app works with. In the ChatGPT App, ChatGPT itself
 * turns the user's content into this shape and calls the tool with it - the
 * server never runs an LLM. The demo harness (/api/demo) fills the same shape
 * with a direct OpenAI call so the flow can be shown without ChatGPT.
 */
export const answerSchema = z.object({
  text: z.string().min(1).describe("Answer option shown to the learner"),
  correct: z.boolean().describe("Whether this option is a correct answer"),
  feedback: z
    .string()
    .optional()
    .describe("Optional feedback shown when this option is chosen"),
});

export const questionSchema = z.object({
  question: z.string().min(1).describe("The question prompt"),
  answers: z
    .array(answerSchema)
    .min(2)
    .max(8)
    .describe("2-8 answer options; at least one must be correct"),
});

export const quizSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Quiz title"),
  introduction: z
    .string()
    .max(400)
    .optional()
    .describe("Optional one or two sentence intro shown before the quiz starts"),
  passPercentage: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(60)
    .describe("Score needed to pass, as a percentage"),
  questions: z
    .array(questionSchema)
    .min(1)
    .max(20)
    .describe("The quiz questions"),
});

export type Answer = z.infer<typeof answerSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuizSpec = z.infer<typeof quizSpecSchema>;

/** Raw shape for MCP tool registration (registerTool wants a ZodRawShape). */
export const quizSpecShape = quizSpecSchema.shape;

/**
 * Normalise + sanity-check a quiz. Throws a readable error if unusable.
 * Guarantees every question has at least one correct answer.
 */
export function validateQuiz(spec: QuizSpec): QuizSpec {
  const parsed = quizSpecSchema.parse(spec);
  parsed.questions.forEach((q, i) => {
    if (!q.answers.some((a) => a.correct)) {
      throw new Error(
        `Question ${i + 1} ("${q.question.slice(0, 40)}...") has no correct answer marked.`,
      );
    }
  });
  return parsed;
}
