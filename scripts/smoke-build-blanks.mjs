/**
 * Smoke test: build a sample Fill in the Blanks .h5p and check it is
 * structurally a valid H5P package.
 *
 *   npx tsx scripts/smoke-build-blanks.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { checkDependencyClosure } from "./_lib/checkDependencyClosure.mjs";
import { buildBlanksH5p } from "../lib/h5p/buildBlanks.ts";

const sample = {
  title: "Cell Biology Basics",
  text: "Fill in the missing words",
  questions: [
    "The *mitochondria* is the powerhouse of the cell.",
    "Plant cells have a rigid *cell wall/wall* made of cellulose.",
    "*DNA* carries genetic information in the nucleus.",
  ],
};

const built = await buildBlanksH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
errors.push(...(await checkDependencyClosure(zip, h5pJson.preloadedDependencies)));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.Blanks") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (contentJson.questions.length !== sample.questions.length) errors.push("question count mismatch");
contentJson.questions.forEach((q, i) => {
  if (!/\*[^*]+\*/.test(q)) errors.push(`question ${i} lost its blank marker`);
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
