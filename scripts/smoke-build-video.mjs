/**
 * Smoke test: build a sample Interactive Video .h5p and check it is
 * structurally a valid H5P package. Writes the file to scratchpad so it can
 * be opened in Lumi / imported to h5p.com by hand.
 *
 *   npx tsx scripts/smoke-build-video.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { buildVideoH5p } from "../lib/h5p/buildVideo.ts";

const sample = {
  title: "How Volcanoes Erupt",
  youtubeUrl: "https://www.youtube.com/watch?v=BitmWiHFvT8",
  introText: "A short explainer on why volcanoes erupt.",
  interactionDensity: "standard",
  timeline: [
    { kind: "text", timestampSeconds: 10, title: "Note", body: "Magma builds pressure underground." },
    {
      kind: "question",
      timestampSeconds: 30,
      pauseVideo: true,
      question: {
        type: "truefalse",
        statement: "Magma is called lava once it reaches the surface.",
        correct: true,
        correctFeedback: "Correct!",
      },
    },
    {
      kind: "question",
      timestampSeconds: 60,
      pauseVideo: true,
      question: {
        type: "multichoice",
        question: "What gas buildup often triggers an eruption?",
        answers: [
          { text: "Carbon dioxide and water vapor", correct: true },
          { text: "Helium", correct: false },
          { text: "Nitrogen", correct: false },
        ],
      },
    },
  ],
};

const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

const built = await buildVideoH5p(sample);
const zip = await JSZip.loadAsync(built.buffer);

const errors = [];
const need = ["h5p.json", "content/content.json"];
for (const f of need) if (!zip.file(f)) errors.push(`missing ${f}`);

const h5pJson = JSON.parse(await zip.file("h5p.json").async("string"));
const contentJson = JSON.parse(await zip.file("content/content.json").async("string"));

if (h5pJson.mainLibrary !== "H5P.InteractiveVideo") errors.push("mainLibrary wrong");
for (const dep of h5pJson.preloadedDependencies) {
  const folder = `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}/library.json`;
  if (!zip.file(folder)) errors.push(`declared dependency not bundled: ${folder}`);
}

const interactions = contentJson.interactiveVideo.assets.interactions;
if (interactions.length !== sample.timeline.length) errors.push("interaction count mismatch");
interactions.forEach((it, i) => {
  const want = sample.timeline[i];
  if (it.duration.from !== want.timestampSeconds) errors.push(`interaction ${i} timestamp mismatch`);
  if (want.kind === "text" && it.action.library !== "H5P.Text 1.1") errors.push(`interaction ${i} text library mismatch`);
  if (want.kind === "question") {
    const expectedLib = want.question.type === "truefalse" ? "H5P.TrueFalse 1.8" : "H5P.MultiChoice 1.16";
    if (it.action.library !== expectedLib) errors.push(`interaction ${i} question library mismatch: ${it.action.library}`);
  }
});

const videoPath = contentJson.interactiveVideo.video.files[0].path;
if (!YOUTUBE_ID_RE.test(videoPath)) errors.push(`video path does not match H5P.Video's own YouTube regex: ${videoPath}`);

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
