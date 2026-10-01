import { z } from "zod";

/**
 * H5P.Accordion: a list of expandable header+body panels. Simpler than Book -
 * no chapters/checkpoints, just a flat list of title+content pairs. Good for
 * FAQ-style or reference content where each panel stands alone.
 */

export const panelSchema = z.object({
  title: z.string().min(1).max(140).describe("Panel header, always visible"),
  bodyParagraphs: z
    .array(z.string().min(1))
    .min(1)
    .max(6)
    .describe("The panel's content, one paragraph per entry, shown when expanded"),
});

export const accordionSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Accordion title"),
  panels: z.array(panelSchema).min(1).max(20).describe("The expandable panels"),
});

export type Panel = z.infer<typeof panelSchema>;
export type AccordionSpec = z.infer<typeof accordionSpecSchema>;

export const accordionSpecShape = accordionSpecSchema.shape;

export function validateAccordion(spec: AccordionSpec): AccordionSpec {
  return accordionSpecSchema.parse(spec);
}
