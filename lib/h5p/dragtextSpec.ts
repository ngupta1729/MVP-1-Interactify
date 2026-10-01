import { z } from "zod";

/**
 * H5P.DragText (Drag the Words). A passage of text where marked words are
 * pulled out into a word bank and dragged back into their blanks. Same
 * asterisk marker syntax as Blanks - "*word*" - verified against
 * h5p/h5p-drag-text's own src/scripts/parse-text.js, not guessed.
 */

const BLANK_RE = /\*[^*]+\*/;

export const dragtextSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Activity title"),
  taskDescription: z
    .string()
    .min(1)
    .max(200)
    .default("Drag the words into the correct boxes")
    .describe("Instruction shown above the passage"),
  textField: z
    .string()
    .min(1)
    .max(2000)
    .refine((t) => BLANK_RE.test(t), {
      message: 'The passage must contain at least one draggable word marked like "*word*".',
    })
    .describe(
      'The passage, with each word or short phrase that should be draggable wrapped in asterisks, ' +
        'e.g. "The mitochondria is the *powerhouse* of the cell." Each blank accepts exactly the marked ' +
        "text (plus any distractor sharing the same length/position is not guaranteed) - keep marked terms short.",
    ),
  distractors: z
    .string()
    .max(500)
    .optional()
    .describe(
      'Optional extra decoy words that appear in the word bank but do not belong in any blank, using the ' +
        'same asterisk syntax, space-separated, e.g. "*mitochondria* *nucleus*".',
    ),
});

export type DragtextSpec = z.infer<typeof dragtextSpecSchema>;

export const dragtextSpecShape = dragtextSpecSchema.shape;

export function validateDragtext(spec: DragtextSpec): DragtextSpec {
  return dragtextSpecSchema.parse(spec);
}
