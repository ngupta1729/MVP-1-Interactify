/**
 * Refreshes lib/h5p/vendor/h5p-libraries.zip - the frozen H5P runtime libraries
 * that buildQuiz.ts/buildBook.ts/buildVideo.ts stitch generated content into.
 *
 * Source: the H5P Hub's official content-type bundles, one per content type we
 * support, each shipping every dependency. We keep only the library folders
 * actually needed to PLAY the content types we build (no editor libs, no
 * unused question types), merge them into one zip (folders overlap heavily
 * across bundles - e.g. FontAwesome, H5P.Question - so a merged zip stays
 * small and per-content-type builders filter to just what they need via
 * loadVendorFiles()), then write it out.
 *
 * Also records each source's ETag to h5p-libraries.meta.json - the baseline
 * that scripts/check-h5p-updates.mjs compares future HEAD requests against,
 * so we get a signal when the Hub publishes a new content-type version
 * without having to re-download and diff the bundles ourselves.
 *
 *   node scripts/fetch-h5p-libraries.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { HUB_SOURCES } from "../lib/h5p/checkHubUpdates.ts";

const SOURCES = HUB_SOURCES;
const OUT = path.join("lib", "h5p", "vendor", "h5p-libraries.zip");
const META_OUT = path.join("lib", "h5p", "vendor", "h5p-libraries.meta.json");

// Versions bumped 2026-10-01 for the hub-api.h5p.org migration (new design
// system) - see memory note h5p-hub-migration-deferred.md. H5P.Components is
// new in this generation of the Hub: H5P.Question now declares it as a real
// dependency (confirmed in its real library.json, not guessed), which
// cascades to nearly every content type below through H5P.Question/
// H5P.JoubelUI - this was NOT needed on the old api.h5p.org Hub.
const KEEP = [
  // Shared transitive closure of H5P.Question / H5P.JoubelUI - needed by
  // nearly every content type below. See each builder's own preloaded-deps
  // comment for the exact reasoning per type.
  "H5P.JoubelUI-1.3",
  "H5P.Transition-1.0",
  "H5P.FontIcons-1.0",
  "FontAwesome-4.5",
  "H5P.Question-1.5",
  "H5P.Components-1.0",
  "jQuery.ui-1.10",
  // Quiz (H5P.QuestionSet)
  "H5P.QuestionSet-1.21",
  "H5P.MultiChoice-1.16",
  "H5P.Video-1.6",
  // Interactive Book
  "H5P.InteractiveBook-1.15",
  "H5P.Column-1.22",
  "H5P.AdvancedText-1.1",
  "H5P.TrueFalse-1.8",
  // Interactive Video
  "H5P.InteractiveVideo-1.28",
  "H5P.DragNBar-1.5",
  "H5P.DragNDrop-1.1",
  "H5P.DragNResize-1.2",
  "H5P.Text-1.1",
  // Accordion
  "H5P.Accordion-1.0",
  // Dialog Cards
  "H5P.Dialogcards-1.9",
  "H5P.Audio-1.5",
  // Fill in the Blanks
  "H5P.Blanks-1.14",
  "H5P.TextUtilities-1.3",
  // Drag the Words
  "H5P.DragText-1.10",
  // Single Choice Set
  "H5P.SingleChoiceSet-1.11",
  // Crossword
  "H5P.Crossword-0.5",
  "H5P.Image-1.1",
  "H5P.MaterialDesignIcons-1.0",
];

const out = new JSZip();
const seenTop = new Set();
const meta = {};
let files = 0;

for (const source of SOURCES) {
  const res = await fetch(source, { headers: { "User-Agent": "h5p-chatgpt-app/0.1" } });
  if (!res.ok) throw new Error(`Hub download failed (${source}): ${res.status} ${res.statusText}`);
  meta[source] = { etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") };
  const srcZip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));

  for (const entry of Object.values(srcZip.files)) {
    if (entry.dir) continue;
    const top = entry.name.split("/")[0];
    if (!KEEP.includes(top)) continue;
    if (out.file(entry.name)) continue; // already added from an earlier source (shared library)
    out.file(entry.name, await entry.async("nodebuffer"));
    seenTop.add(top);
    files++;
  }
}

const missing = KEEP.filter((k) => !seenTop.has(k));
if (missing.length) throw new Error(`Hub bundles missing expected libraries: ${missing.join(", ")}`);

await mkdir(path.dirname(OUT), { recursive: true });
const buf = await out.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
await writeFile(OUT, buf);
await writeFile(META_OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), sources: meta }, null, 2));
console.log(`Wrote ${OUT} - ${files} files, ${(buf.length / 1024 / 1024).toFixed(2)} MB, libraries: ${[...seenTop].sort().join(", ")}`);
console.log(`Wrote ${META_OUT} - baseline ETags for ${Object.keys(meta).length} sources`);
