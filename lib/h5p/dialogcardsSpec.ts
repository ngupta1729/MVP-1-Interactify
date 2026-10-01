import { z } from "zod";

/**
 * H5P.Dialogcards: a deck of front/back text cards for quick review
 * (vocab, definitions, Q&A recall). Text-only - no per-card image/audio,
 * both optional fields per semantics.json (h5p/h5p-dialogcards).
 */

export const cardSchema = z.object({
  front: z.string().min(1).max(300).describe("Text shown on the front of the card"),
  back: z.string().min(1).max(300).describe("Text shown on the back of the card, after flipping"),
});

export const dialogcardsSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Deck title"),
  description: z.string().max(300).optional().describe("Optional one-sentence instructions shown above the deck"),
  cards: z.array(cardSchema).min(1).max(30).describe("The front/back cards"),
});

export type Card = z.infer<typeof cardSchema>;
export type DialogcardsSpec = z.infer<typeof dialogcardsSpecSchema>;

export const dialogcardsSpecShape = dialogcardsSpecSchema.shape;

export function validateDialogcards(spec: DialogcardsSpec): DialogcardsSpec {
  return dialogcardsSpecSchema.parse(spec);
}
