/**
 * Smoke test: build a sample Drag the Words .h5p and check it is
 * structurally a valid H5P package.
 *
 *   npx tsx scripts/smoke-build-dragtext.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { checkDependencyClosure } from "./_lib/checkDependencyClosure.mjs";
import { buildDragTextH5p } from "../lib/h5p/buildDragText.ts";

const sample = {
  title: "Water Cycle",
  taskDescription: "Drag the words into the correct boxes",
  textField: "Water *evaporates* from the ocean, forms *clouds* through condensation, then falls back down as *precipitation*.",
  distractors: "*erosion* *sediment*",
};

const built = await buildDragTextH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
errors.push(...(await checkDependencyClosure(zip, h5pJson.preloadedDependencies)));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.DragText") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (!/\*evaporates\*/.test(contentJson.textField)) errors.push("textField lost its blank marker");
if (!contentJson.distractors.includes("erosion")) errors.push("distractors not preserved");

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
