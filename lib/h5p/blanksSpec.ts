import { z } from "zod";

/**
 * H5P.Blanks (Fill in the Blanks). Each question is plain text with the
 * blanked word(s) wrapped in asterisks - the exact syntax H5P.Blanks itself
 * parses at runtime (verified against h5p/h5p-blanks' own js/blanks.js
 * handleBlanks(), not guessed): "*answer*", or "*answer/alt1/alt2*" for
 * multiple accepted answers. This is also literally how a human author
 * would type it in H5P's own editor, so it's a natural format for the model
 * to produce directly rather than us re-deriving blanks from plain text.
 */

const BLANK_RE = /\*[^*]+\*/;

export const blanksSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Activity title"),
  text: z.string().min(1).max(200).default("Fill in the missing words").describe("Instruction shown above the questions"),
  questions: z
    .array(
      z
        .string()
        .min(1)
        .max(500)
        .refine((q) => BLANK_RE.test(q), {
          message: 'Each question must contain at least one blank marked like "*answer*" or "*answer/alt1/alt2*".',
        }),
    )
    .min(1)
    .max(20)
    .describe(
      'The fill-in-the-blank sentences. Mark each blank by wrapping the correct word(s) in asterisks, ' +
        'e.g. "The capital of France is *Paris*." Use a slash to accept multiple correct answers for the ' +
        'same blank, e.g. "*color/colour*". A sentence can have more than one blank.',
    ),
});

export type BlanksSpec = z.infer<typeof blanksSpecSchema>;

export const blanksSpecShape = blanksSpecSchema.shape;

export function validateBlanks(spec: BlanksSpec): BlanksSpec {
  return blanksSpecSchema.parse(spec);
}
