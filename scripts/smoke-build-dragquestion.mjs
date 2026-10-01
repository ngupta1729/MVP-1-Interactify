/**
 * Smoke test: build a sample Drag and Drop .h5p and check it is
 * structurally a valid H5P package.
 *
 *   npx tsx scripts/smoke-build-dragquestion.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { checkDependencyClosure } from "./_lib/checkDependencyClosure.mjs";
import { buildDragQuestionH5p } from "../lib/h5p/buildDragQuestion.ts";

const sample = {
  title: "Match the Programming Term",
  pairs: [
    { term: "Variable", definition: "A named storage location for a value" },
    { term: "Function", definition: "A reusable block of code that performs a task" },
    { term: "Loop", definition: "A structure that repeats code while a condition holds" },
    { term: "Array", definition: "An ordered collection of values" },
  ],
};

const built = await buildDragQuestionH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
errors.push(...(await checkDependencyClosure(zip, h5pJson.preloadedDependencies)));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.DragQuestion") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
const { elements, dropZones } = contentJson.question.task;
if (elements.length !== sample.pairs.length) errors.push("element count mismatch");
if (dropZones.length !== sample.pairs.length) errors.push("dropZone count mismatch");
elements.forEach((el, i) => {
  if (el.type.library !== "H5P.AdvancedText 1.1") errors.push(`element ${i} unexpected library ${el.type.library}`);
  if (el.dropZones[0] !== String(i)) errors.push(`element ${i} dropZones cross-reference wrong: ${JSON.stringify(el.dropZones)}`);
  if (typeof el.width !== "number" || el.width > 50) errors.push(`element ${i} width looks like a stray percentage, not em: ${el.width}`);
});
dropZones.forEach((dz, i) => {
  if (dz.correctElements[0] !== String(i)) errors.push(`dropZone ${i} correctElements cross-reference wrong: ${JSON.stringify(dz.correctElements)}`);
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
