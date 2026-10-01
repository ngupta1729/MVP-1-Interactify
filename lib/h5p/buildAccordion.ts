import { randomUUID } from "node:crypto";
import { escapeHtml, packFiles } from "./buildQuiz";
import { validateAccordion, type AccordionSpec, type Panel } from "./accordionSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn an AccordionSpec into a valid .h5p package. Panel content reuses the
 * same H5P.AdvancedText block shape as Book chapters (lib/h5p/buildBook.ts) -
 * Accordion's semantics.json restricts its content field to exactly that
 * one library option, confirmed from h5p/h5p-accordion's semantics.json.
 */

export const ACCORDION_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.Accordion", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.AdvancedText", majorVersion: 1, minorVersion: 1 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
];
export const ACCORDION_VENDOR_FOLDERS = folderNamesFor(ACCORDION_PRELOADED_DEPENDENCIES);

function advancedTextBlock(html: string) {
  return {
    library: "H5P.AdvancedText 1.1",
    subContentId: randomUUID(),
    metadata: { contentType: "Text", license: "U", title: "Text" },
    params: { text: html },
  };
}

function panelToContent(panel: Panel) {
  const html = panel.bodyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>\n`).join("");
  return {
    title: panel.title,
    content: advancedTextBlock(html),
  };
}

function buildContentJson(spec: AccordionSpec) {
  return {
    panels: spec.panels.map(panelToContent),
    hTag: "h2",
  };
}

function buildH5pJson(spec: AccordionSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.Accordion",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: ACCORDION_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "accordion"
  );
}

export async function buildAccordionFiles(rawSpec: AccordionSpec): Promise<BuiltFiles> {
  const spec = validateAccordion(rawSpec);
  const files = new Map(await loadVendorFiles(ACCORDION_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildAccordionH5p(rawSpec: AccordionSpec): Promise<BuiltH5p> {
  const spec = validateAccordion(rawSpec);
  const { filename, files } = await buildAccordionFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
