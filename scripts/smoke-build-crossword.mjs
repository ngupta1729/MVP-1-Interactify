/**
 * Smoke test: build a sample Crossword .h5p and check it is structurally
 * a valid H5P package.
 *
 *   npx tsx scripts/smoke-build-crossword.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { checkDependencyClosure } from "./_lib/checkDependencyClosure.mjs";
import { buildCrosswordH5p } from "../lib/h5p/buildCrossword.ts";

const sample = {
  title: "Space Exploration",
  taskDescription: "Solve the crossword about space.",
  words: [
    { clue: "Earth's natural satellite", answer: "moon" },
    { clue: "Red planet", answer: "mars" },
    { clue: "Star at the center of our solar system", answer: "sun" },
    { clue: "A vehicle for space travel", answer: "rocket" },
  ],
};

const built = await buildCrosswordH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
errors.push(...(await checkDependencyClosure(zip, h5pJson.preloadedDependencies)));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.Crossword") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (contentJson.words.length !== sample.words.length) errors.push("word count mismatch");
contentJson.words.forEach((w, i) => {
  if (w.answer !== sample.words[i].answer.toUpperCase()) errors.push(`word ${i} answer not uppercased`);
  if (w.fixWord !== false) errors.push(`word ${i} fixWord should be false (let the runtime place it)`);
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
