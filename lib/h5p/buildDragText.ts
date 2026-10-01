import { packFiles } from "./buildQuiz";
import { validateDragtext, type DragtextSpec } from "./dragtextSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a DragtextSpec into a valid .h5p package (H5P Drag the Words).
 * Content shape and l10n defaults verified against h5p/h5p-drag-text's real
 * semantics.json, not guessed.
 */

// Deps verified against the ACTUAL Hub-shipped bundle's library.json, not
// GitHub master (which is ahead of what's published - master declares an
// H5P.Components dependency that the shipped 1.10 release doesn't have).
// H5P.JoubelUI/H5P.Question also transitively need H5P.Transition and
// H5P.FontIcons (confirmed by reading their own library.json) - missed on
// the first pass, caught by a real "Failed to fetch" in ChatGPT.
// Versions + deps verified against hub-api.h5p.org (the new-design-system
// Hub, migrated 2026-10-01 - see memory note h5p-hub-migration-deferred.md).
// DragText and H5P.Question both now declare H5P.Components as a real
// dependency (new in this Hub generation) - this is the Components it was
// mistakenly expected to need on the OLD Hub during the original build
// (and correctly removed then, since it didn't exist there yet).
export const DRAGTEXT_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.DragText", majorVersion: 1, minorVersion: 10 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "jQuery.ui", majorVersion: 1, minorVersion: 10 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.Components", majorVersion: 1, minorVersion: 0 },
];
export const DRAGTEXT_VENDOR_FOLDERS = folderNamesFor(DRAGTEXT_PRELOADED_DEPENDENCIES);

function buildContentJson(spec: DragtextSpec) {
  return {
    taskDescription: spec.taskDescription,
    textField: spec.textField,
    distractors: spec.distractors ?? "",
    checkAnswer: "Check",
    submitAnswer: "Submit",
    tryAgain: "Retry",
    showSolution: "Show solution",
    dropZoneIndex: "Drop Zone @index.",
    empty: "Drop Zone @index is empty.",
    contains: "Drop Zone @index contains draggable @draggable.",
    ariaDraggableIndex: "@index of @count draggables.",
    tipLabel: "Show tip",
    correctText: "Correct!",
    incorrectText: "Incorrect!",
    resetDropTitle: "Reset drop",
    resetDropDescription: "Are you sure you want to reset this drop zone?",
    grabbed: "Draggable is grabbed.",
    cancelledDragging: "Cancelled dragging.",
    correctAnswer: "Correct answer:",
    feedbackHeader: "Feedback",
    behaviour: {
      enableRetry: true,
      enableSolutionsButton: true,
      enableCheckButton: true,
      instantFeedback: false,
    },
    scoreBarLabel: "You got :num out of :total points",
    a11yCheck: "Check the answers. The responses will be marked as correct, incorrect, or unanswered.",
    a11yShowSolution: "Show the solution. The task will be marked with its correct solution.",
    a11yRetry: "Retry the task. Reset all responses and start the task over again.",
  };
}

function buildH5pJson(spec: DragtextSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.DragText",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: DRAGTEXT_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "drag-the-words"
  );
}

export async function buildDragTextFiles(rawSpec: DragtextSpec): Promise<BuiltFiles> {
  const spec = validateDragtext(rawSpec);
  const files = new Map(await loadVendorFiles(DRAGTEXT_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildDragTextH5p(rawSpec: DragtextSpec): Promise<BuiltH5p> {
  const spec = validateDragtext(rawSpec);
  const { filename, files } = await buildDragTextFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
