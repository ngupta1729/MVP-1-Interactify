/**
 * Smoke test: build a sample quiz .h5p and check it is structurally a valid
 * H5P package. Writes the file to scratchpad so it can be opened in Lumi /
 * imported to h5p.com by hand.
 *
 *   npx tsx scripts/smoke-build-h5p.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { buildQuizH5p } from "../lib/h5p/buildQuiz.ts";

const sample = {
  title: "Photosynthesis Basics",
  introduction: "A quick check on how plants turn light into energy.",
  passPercentage: 60,
  questions: [
    {
      question: "What gas do plants take in during photosynthesis?",
      answers: [
        { text: "Carbon dioxide", correct: true, feedback: "Right - CO2 enters through the stomata." },
        { text: "Oxygen", correct: false },
        { text: "Nitrogen", correct: false },
      ],
    },
    {
      question: "Which parts of a plant are the main sites of photosynthesis?",
      answers: [
        { text: "Leaves", correct: true },
        { text: "Roots", correct: false },
        { text: "Chloroplasts in leaf cells", correct: true },
      ],
    },
  ],
};

const built = await buildQuizH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.QuestionSet") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}
if (contentJson.questions.length !== sample.questions.length) errors.push("question count mismatch");
for (const q of contentJson.questions) {
  if (q.library !== "H5P.MultiChoice 1.16") errors.push(`unexpected question library ${q.library}`);
  if (!q.subContentId) errors.push("question missing subContentId");
  if (!q.params.answers.some((a) => a.correct)) errors.push("question has no correct answer");
}

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
