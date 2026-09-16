/**
 * Smoke test: build a sample Interactive Book .h5p and check it is
 * structurally a valid H5P package. Writes the file to scratchpad so it can
 * be opened in Lumi / imported to h5p.com by hand.
 *
 *   npx tsx scripts/smoke-build-book.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { buildBookH5p } from "../lib/h5p/buildBook.ts";

const sample = {
  title: "Photosynthesis: A Short Guide",
  introduction: "A quick interactive walkthrough of how plants turn light into energy.",
  chapters: [
    {
      heading: "What Is Photosynthesis?",
      bodyParagraphs: [
        "Photosynthesis is the process plants use to convert light energy into chemical energy stored in glucose.",
        "It happens mainly in the leaves, inside structures called chloroplasts.",
      ],
      checkpoint: {
        type: "truefalse",
        statement: "Photosynthesis happens mainly in a plant's roots.",
        correct: false,
        correctFeedback: "Correct - it happens mainly in the leaves.",
        incorrectFeedback: "Not quite - it happens mainly in the leaves, not the roots.",
      },
    },
    {
      heading: "The Ingredients",
      bodyParagraphs: [
        "Plants need three things to photosynthesize: sunlight, water, and carbon dioxide.",
        "In return, they produce glucose (their food) and release oxygen as a byproduct.",
      ],
      checkpoint: {
        type: "multichoice",
        question: "Which gas do plants release as a byproduct of photosynthesis?",
        answers: [
          { text: "Oxygen", correct: true, feedback: "Right!" },
          { text: "Carbon dioxide", correct: false },
          { text: "Nitrogen", correct: false },
        ],
      },
    },
    {
      heading: "Why It Matters",
      bodyParagraphs: [
        "Photosynthesis is the foundation of most food chains on Earth and produces the oxygen we breathe.",
      ],
    },
  ],
  checkpointFrequency: "some_chapters",
};

const built = await buildBookH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.InteractiveBook") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (contentJson.chapters.length !== sample.chapters.length) errors.push("chapter count mismatch");
contentJson.chapters.forEach((ch, i) => {
  if (ch.library !== "H5P.Column 1.18") errors.push(`chapter ${i} unexpected library ${ch.library}`);
  if (!ch.subContentId) errors.push(`chapter ${i} missing subContentId`);
  const expectedBlocks = 1 + sample.chapters[i].bodyParagraphs.length + (sample.chapters[i].checkpoint ? 1 : 0);
  if (ch.params.content.length !== expectedBlocks) {
    errors.push(`chapter ${i} block count mismatch: got ${ch.params.content.length}, expected ${expectedBlocks}`);
  }
  const lastBlock = ch.params.content[ch.params.content.length - 1].content;
  const wantsCheckpoint = Boolean(sample.chapters[i].checkpoint);
  if (wantsCheckpoint) {
    const type = sample.chapters[i].checkpoint.type;
    const expectedLib = type === "truefalse" ? "H5P.TrueFalse 1.8" : "H5P.MultiChoice 1.16";
    if (lastBlock.library !== expectedLib) errors.push(`chapter ${i} checkpoint library mismatch: ${lastBlock.library}`);
  }
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
