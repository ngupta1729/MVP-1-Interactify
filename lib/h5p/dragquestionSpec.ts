import { z } from "zod";

/**
 * H5P.DragQuestion (Drag and Drop). Real DragQuestion content is normally
 * image-based (drag labels onto a diagram), which we can't do without an
 * image pipeline. Instead we generate the one layout that works well as pure
 * text: a "match the term to its definition" board - draggable text pieces
 * on the left, labeled drop targets on the right, one correct match each.
 *
 * Element/drop-zone shapes (the `type: {library, params}` wrapper, and the
 * `dropZones`/`correctElements` index-array cross-references) verified
 * against h5p/h5p-drag-question's real src/draggable.js and
 * src/drag-question.js, not guessed.
 */

export const dragPairSchema = z.object({
  term: z.string().min(1).max(60).describe("The short draggable text (a term, label, or step)"),
  definition: z.string().min(1).max(160).describe("The drop target's label this term matches (a definition, category, or description)"),
});

export const dragquestionSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Activity title"),
  pairs: z
    .array(dragPairSchema)
    .min(2)
    .max(10)
    .describe("The term/definition pairs - each term is dragged onto its matching definition"),
});

export type DragPair = z.infer<typeof dragPairSchema>;
export type DragquestionSpec = z.infer<typeof dragquestionSpecSchema>;

export const dragquestionSpecShape = dragquestionSpecSchema.shape;

export function validateDragquestion(spec: DragquestionSpec): DragquestionSpec {
  return dragquestionSpecSchema.parse(spec);
}
