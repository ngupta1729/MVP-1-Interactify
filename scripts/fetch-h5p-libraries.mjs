/**
 * Refreshes lib/h5p/vendor/h5p-libraries.zip - the frozen H5P runtime libraries
 * that buildQuiz.ts stitches generated content into.
 *
 * Source: the H5P Hub's official content-type bundle for H5P.QuestionSet, which
 * ships every dependency. We keep only the 8 folders needed to PLAY a Question
 * Set built from Multiple Choice questions (no editor libs, no unused question
 * types), then re-zip.
 *
 *   node scripts/fetch-h5p-libraries.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const SOURCE = "https://api.h5p.org/v1/content-types/H5P.QuestionSet";
const OUT = path.join("lib", "h5p", "vendor", "h5p-libraries.zip");

const KEEP = [
  "H5P.QuestionSet-1.20",
  "H5P.MultiChoice-1.16",
  "H5P.Question-1.5",
  "H5P.JoubelUI-1.3",
  "H5P.Transition-1.0",
  "H5P.FontIcons-1.0",
  "FontAwesome-4.5",
  "H5P.Video-1.6",
];

const res = await fetch(SOURCE, { headers: { "User-Agent": "h5p-chatgpt-app/0.1" } });
if (!res.ok) throw new Error(`Hub download failed: ${res.status} ${res.statusText}`);
const srcZip = await JSZip.loadAsync(Buffer.from(await res.arrayBuffer()));

const out = new JSZip();
const seenTop = new Set();
let files = 0;
for (const entry of Object.values(srcZip.files)) {
  if (entry.dir) continue;
  const top = entry.name.split("/")[0];
  if (!KEEP.includes(top)) continue;
  seenTop.add(top);
  out.file(entry.name, await entry.async("nodebuffer"));
  files++;
}

const missing = KEEP.filter((k) => !seenTop.has(k));
if (missing.length) throw new Error(`Hub bundle missing expected libraries: ${missing.join(", ")}`);

await mkdir(path.dirname(OUT), { recursive: true });
const buf = await out.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
await writeFile(OUT, buf);
console.log(`Wrote ${OUT} - ${files} files, ${(buf.length / 1024 / 1024).toFixed(2)} MB, libraries: ${[...seenTop].sort().join(", ")}`);
