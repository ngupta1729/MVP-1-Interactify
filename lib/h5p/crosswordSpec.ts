import { z } from "zod";

/**
 * H5P.Crossword. Grid placement (which words go where, across vs down) is
 * computed by the CONTENT itself at play time in the browser - see
 * src/scripts/services/h5p-crossword-generator.js in otacke/h5p-crossword,
 * confirmed by reading the source rather than guessed. We only need to
 * supply clue/answer pairs with fixWord left false; the runtime's own
 * generator finds a valid overlapping layout. row/column/orientation are
 * only meaningful when fixWord is true, so we send inert placeholders.
 *
 * Answers are constrained to a single unbroken word (letters only, no
 * spaces) - the conventional crossword-grid assumption, and the safest
 * shape for the runtime's overlap-based placement algorithm to work with.
 */

const SINGLE_WORD_RE = /^[A-Za-z]+$/;

export const crosswordWordSchema = z.object({
  clue: z.string().min(1).max(200).describe("The clue text shown to the solver"),
  answer: z
    .string()
    .min(2)
    .max(20)
    .refine((a) => SINGLE_WORD_RE.test(a), {
      message: "Answer must be a single word using only letters, no spaces or punctuation.",
    })
    .describe("The answer - a single word, letters only (no spaces or hyphens)"),
});

export const crosswordSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Puzzle title"),
  taskDescription: z.string().max(300).optional().describe("Optional instructions shown above the grid"),
  words: z
    .array(crosswordWordSchema)
    .min(2)
    .max(20)
    .describe(
      "The clue/answer pairs. At least some answers should share letters with each other (e.g. via a common " +
        "theme) so the crossword generator can interlock them into a connected grid - a set of totally " +
        "unrelated words may fail to generate a complete puzzle.",
    ),
});

export type CrosswordWord = z.infer<typeof crosswordWordSchema>;
export type CrosswordSpec = z.infer<typeof crosswordSpecSchema>;

export const crosswordSpecShape = crosswordSpecSchema.shape;

export function validateCrossword(spec: CrosswordSpec): CrosswordSpec {
  return crosswordSpecSchema.parse(spec);
}
