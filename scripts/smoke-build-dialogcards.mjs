/**
 * Smoke test: build a sample Dialog Cards .h5p and check it is structurally
 * a valid H5P package.
 *
 *   npx tsx scripts/smoke-build-dialogcards.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { buildDialogcardsH5p } from "../lib/h5p/buildDialogcards.ts";

const sample = {
  title: "Spanish Vocabulary: Kitchen",
  description: "Flip each card to check your translation.",
  cards: [
    { front: "la cocina", back: "the kitchen" },
    { front: "el refrigerador", back: "the refrigerator" },
    { front: "la estufa", back: "the stove" },
    { front: "el fregadero", back: "the sink" },
  ],
};

const built = await buildDialogcardsH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.Dialogcards") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (contentJson.dialogs.length !== sample.cards.length) errors.push("card count mismatch");
contentJson.dialogs.forEach((d, i) => {
  if (!d.text.includes(sample.cards[i].front)) errors.push(`card ${i} front text mismatch`);
  if (!d.answer.includes(sample.cards[i].back)) errors.push(`card ${i} back text mismatch`);
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
