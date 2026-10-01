/**
 * Smoke test: build a sample Accordion .h5p and check it is structurally
 * a valid H5P package.
 *
 *   npx tsx scripts/smoke-build-accordion.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { buildAccordionH5p } from "../lib/h5p/buildAccordion.ts";

const sample = {
  title: "Study Skills FAQ",
  panels: [
    { title: "How should I take notes?", bodyParagraphs: ["Use the Cornell method: divide your page into cues, notes, and a summary."] },
    { title: "How long should I study at a time?", bodyParagraphs: ["Aim for 25-minute focused blocks with 5-minute breaks (the Pomodoro technique)."] },
    { title: "When should I review material?", bodyParagraphs: ["Review within 24 hours, then again after a week, to fight the forgetting curve."] },
  ],
};

const built = await buildAccordionH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.Accordion") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (contentJson.panels.length !== sample.panels.length) errors.push("panel count mismatch");
contentJson.panels.forEach((p, i) => {
  if (p.content.library !== "H5P.AdvancedText 1.1") errors.push(`panel ${i} unexpected library ${p.content.library}`);
  if (!p.content.subContentId) errors.push(`panel ${i} missing subContentId`);
});

const libFolders = new Set(
  Object.keys(zip.files)
    .filter((n) => n.includes("/"))
    .map((n) => n.split("/")[0])
    .filter((n) => n !== "content"),
);

const outPath = path.join(os.tmpdir(), built.filename);
await writeFile(outPath, built.buffer);

console.log(`built ${built.filename} (${(built.buffer.length / 1024).toFixed(0)} KB)`);
console.log(`bundled libraries: ${[...libFolders].sort().join(", ")}`);
console.log(`wrote sample to: ${outPath}`);
if (errors.length) {
  console.error("\nFAILED:\n - " + errors.join("\n - "));
  process.exit(1);
}
console.log("\nOK - package is structurally valid.");
