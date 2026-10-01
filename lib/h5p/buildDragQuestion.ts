import { randomUUID } from "node:crypto";
import { escapeHtml, packFiles } from "./buildQuiz";
import { validateDragquestion, type DragquestionSpec, type DragPair } from "./dragquestionSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a DragquestionSpec into a valid .h5p package (H5P Drag and Drop),
 * laid out as a two-column "match the term to its definition" board - see
 * dragquestionSpec.ts for why. Content shape and l10n defaults verified
 * against h5p/h5p-drag-question's real semantics.json and source, not
 * guessed.
 */

// Deps and version verified against the ACTUAL Hub-shipped bundle's
// library.json, not GitHub master (which is at 1.15; the Hub still serves
// 1.14, and declares no H5P.Components dependency - that's a master-only
// addition). H5P.AdvancedText is still required even though DragQuestion's
// own library.json doesn't list it: it's the sub-library we choose for each
// draggable element's `type` field (same pattern as Book's chapters using
// H5P.AdvancedText under H5P.Column - a content-specific choice a real H5P
// editor would add to preloadedDependencies itself).
// H5P.JoubelUI/H5P.Question also transitively need H5P.Transition and
// H5P.FontIcons (confirmed by reading their own library.json) - missed on
// the first pass, caught by a real "Failed to fetch" in ChatGPT.
export const DRAGQUESTION_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.DragQuestion", majorVersion: 1, minorVersion: 14 },
  { machineName: "H5P.AdvancedText", majorVersion: 1, minorVersion: 1 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "jQuery.ui", majorVersion: 1, minorVersion: 10 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
];
export const DRAGQUESTION_VENDOR_FOLDERS = folderNamesFor(DRAGQUESTION_PRELOADED_DEPENDENCIES);

// Two-column board layout. x/y are percentages of the canvas (confirmed via
// draggable.js: "left: self.x + '%'"); width/height are in em, NOT percent
// (confirmed: "draggableElement.style.width = self.width + 'em'") - a
// pixel-percentage calculation here would silently produce tiny or huge
// boxes depending on font size. settings.size.width/height below only sets
// the canvas's aspect ratio for responsive scaling, not absolute pixels.
const CANVAS_WIDTH = 620;
const ROW_HEIGHT = 60;
const BOX_WIDTH_EM = 13;
const BOX_HEIGHT_EM = 3.2;
const TOP_MARGIN = 20;
const LEFT_X_PCT = 3;
const RIGHT_X_PCT = 55;

function advancedTextField(text: string) {
  return {
    library: "H5P.AdvancedText 1.1",
    params: { text: `<p>${escapeHtml(text)}</p>\n` },
    subContentId: randomUUID(),
    metadata: { contentType: "Text", license: "U", title: "Text" },
  };
}

function buildContentJson(spec: DragquestionSpec) {
  const rows = spec.pairs.length;
  const height = TOP_MARGIN * 2 + rows * ROW_HEIGHT;

  const elements = spec.pairs.map((pair: DragPair, i: number) => ({
    type: advancedTextField(pair.term),
    x: LEFT_X_PCT,
    y: ((TOP_MARGIN + i * ROW_HEIGHT) / height) * 100,
    height: BOX_HEIGHT_EM,
    width: BOX_WIDTH_EM,
    dropZones: [String(i)],
    backgroundOpacity: 100,
    multiple: false,
  }));

  const dropZones = spec.pairs.map((pair: DragPair, i: number) => ({
    label: `<div>${escapeHtml(pair.definition)}</div>`,
    showLabel: true,
    x: RIGHT_X_PCT,
    y: ((TOP_MARGIN + i * ROW_HEIGHT) / height) * 100,
    height: BOX_HEIGHT_EM,
    width: BOX_WIDTH_EM,
    correctElements: [String(i)],
    backgroundOpacity: 100,
    // tipsAndFeedback is marked optional in semantics.json, but
    // H5P.DragQuestion's own runtime (dropzone.js, drag-question.js) reads
    // dropZone.tipsAndFeedback.tip/.feedbackOnCorrect/.feedbackOnIncorrect
    // unconditionally, with no undefined guard - confirmed by reading its
    // real source. Omitting this field crashes the player at mount with
    // "Cannot read properties of undefined (reading 'tip')", caught live in
    // ChatGPT. Always include it, even empty.
    tipsAndFeedback: { tip: "", feedbackOnCorrect: "", feedbackOnIncorrect: "" },
    single: true,
    autoAlign: false,
  }));

  return {
    scoreShow: "Check",
    submit: "Submit",
    tryAgain: "Retry",
    scoreExplanation: "Correct answers give +1 point. Incorrect answers give -1 point. The lowest possible score is 0.",
    question: {
      settings: {
        size: { width: CANVAS_WIDTH, height, field: "background" },
      },
      task: { elements, dropZones },
    },
    overallFeedback: [],
    behaviour: {
      enableRetry: true,
      enableCheckButton: true,
      singlePoint: false,
      applyPenalties: true,
      enableScoreExplanation: true,
      dropZoneHighlighting: "dragging",
      autoAlignSpacing: 2,
      enableFullScreen: false,
      showScorePoints: true,
      showTitle: true,
      dragHandleVisibility: true,
    },
    localize: {
      fullscreen: "Fullscreen",
      exitFullscreen: "Exit fullscreen",
    },
    grabbablePrefix: "Grabbable {num} of {total}.",
    grabbableSuffix: "Placed in dropzone {num}.",
    dropzonePrefix: "Dropzone {num} of {total}.",
    noDropzone: "No dropzone.",
    tipLabel: "Show tip.",
    tipAvailable: "Tip available",
    correctAnswer: "Correct answer",
    wrongAnswer: "Wrong answer",
    feedbackHeader: "Feedback",
    scoreBarLabel: "You got :num out of :total points",
    scoreExplanationButtonLabel: "Show score explanation",
    a11yCheck: "Check the answers. The responses will be marked as correct, incorrect, or unanswered.",
    a11yRetry: "Retry the task. Reset all responses and start the task over again.",
  };
}

function buildH5pJson(spec: DragquestionSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.DragQuestion",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: DRAGQUESTION_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "drag-and-drop"
  );
}

export async function buildDragQuestionFiles(rawSpec: DragquestionSpec): Promise<BuiltFiles> {
  const spec = validateDragquestion(rawSpec);
  const files = new Map(await loadVendorFiles(DRAGQUESTION_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildDragQuestionH5p(rawSpec: DragquestionSpec): Promise<BuiltH5p> {
  const spec = validateDragquestion(rawSpec);
  const { filename, files } = await buildDragQuestionFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
