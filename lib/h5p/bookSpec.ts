import { z } from "zod";
import { checkpointQuestionSchema, validateCheckpoint } from "./checkpointSpec";

/**
 * The book structure this app works with. ChatGPT turns the user's book/PDF
 * content into this shape (chapter headings + paragraphs, with an optional
 * checkpoint question per chapter) and calls the tool with it - the server
 * never runs an LLM.
 *
 * Text-only for v1: no image extraction/embedding yet (see docs on why).
 */

export const chapterSchema = z.object({
  heading: z.string().min(1).max(140).describe("Chapter title, shown in the table of contents"),
  bodyParagraphs: z
    .array(z.string().min(1))
    .min(1)
    .max(12)
    .describe("The chapter's reading content, one paragraph per entry"),
  checkpoint: checkpointQuestionSchema
    .optional()
    .describe("Optional interactive question shown at the end of this chapter"),
});

export const bookSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Book title"),
  introduction: z
    .string()
    .max(400)
    .optional()
    .describe("Optional one or two sentence intro shown on the cover/first page"),
  chapters: z.array(chapterSchema).min(1).max(12).describe("The book's chapters"),
  checkpointFrequency: z
    .enum(["every_chapter", "some_chapters", "end_only", "none"])
    .optional()
    .default("some_chapters")
    .describe(
      "How often the user wants checkpoint questions. Ask the user this up front if they haven't said, rather than guessing.",
    ),
});

export type Chapter = z.infer<typeof chapterSchema>;
export type BookSpec = z.infer<typeof bookSpecSchema>;

/** Raw shape for MCP tool registration (registerTool wants a ZodRawShape). */
export const bookSpecShape = bookSpecSchema.shape;

/** Normalise + sanity-check a book. Throws a readable error if unusable. */
export function validateBook(spec: BookSpec): BookSpec {
  const parsed = bookSpecSchema.parse(spec);
  parsed.chapters.forEach((c) => {
    if (c.checkpoint) validateCheckpoint(c.checkpoint);
  });
  return parsed;
}
