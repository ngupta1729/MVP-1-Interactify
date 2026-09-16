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
 *   node scripts/fetch-h5p-libraries.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const SOURCES = [
  "https://api.h5p.org/v1/content-types/H5P.QuestionSet",
  "https://api.h5p.org/v1/content-types/H5P.InteractiveBook",
  "https://api.h5p.org/v1/content-types/H5P.InteractiveVideo",
];
const OUT = path.join("lib", "h5p", "vendor", "h5p-libraries.zip");

const KEEP = [
  // Quiz (H5P.QuestionSet)
  "H5P.QuestionSet-1.20",
  "H5P.MultiChoice-1.16",
  "H5P.Question-1.5",
  "H5P.JoubelUI-1.3",
  "H5P.Transition-1.0",
  "H5P.FontIcons-1.0",
  "FontAwesome-4.5",
  "H5P.Video-1.6",
  // Interactive Book
  "H5P.InteractiveBook-1.11",
  "H5P.Column-1.18",
  "H5P.AdvancedText-1.1",
  "H5P.TrueFalse-1.8",
  // Interactive Video
  "H5P.InteractiveVideo-1.27",
  "jQuery.ui-1.10",
  "H5P.DragNBar-1.5",
  "H5P.DragNDrop-1.1",
  "H5P.DragNResize-1.2",
  "H5P.Text-1.1",
];

const out = new JSZip();
const seenTop = new Set();
let files = 0;

for (const source of SOURCES) {
  const res = await fetch(source, { headers: { "User-Agent": "h5p-chatgpt-app/0.1" } });
  if (!res.ok) throw new Error(`Hub download failed (${source}): ${res.status} ${res.statusText}`);
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
console.log(`Wrote ${OUT} - ${files} files, ${(buf.length / 1024 / 1024).toFixed(2)} MB, libraries: ${[...seenTop].sort().join(", ")}`);
