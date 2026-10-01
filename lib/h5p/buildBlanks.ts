import { packFiles, CONFIRM_CHECK, CONFIRM_RETRY } from "./buildQuiz";
import { validateBlanks, type BlanksSpec } from "./blanksSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a BlanksSpec into a valid .h5p package (H5P Fill in the Blanks).
 * Content shape and l10n defaults verified against h5p/h5p-blanks' real
 * semantics.json, not guessed. Questions are passed through as-is - the
 * asterisk blank markers are H5P.Blanks' own runtime syntax (see
 * blanksSpec.ts), so no transformation is needed here.
 */

export const BLANKS_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.Blanks", majorVersion: 1, minorVersion: 14 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.TextUtilities", majorVersion: 1, minorVersion: 3 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
];
export const BLANKS_VENDOR_FOLDERS = folderNamesFor(BLANKS_PRELOADED_DEPENDENCIES);

function buildContentJson(spec: BlanksSpec) {
  return {
    text: spec.text,
    questions: spec.questions,
    showSolutions: "Show solution",
    tryAgain: "Retry",
    checkAnswer: "Check",
    submitAnswer: "Submit",
    notFilledOut: "Please fill in all blanks to view solution",
    answerIsCorrect: "':ans' is correct",
    answerIsWrong: "':ans' is wrong",
    answeredCorrectly: "Answered correctly",
    answeredIncorrectly: "Answered incorrectly",
    solutionLabel: "Correct answer:",
    inputLabel: "Blank input @num of @total",
    inputHasTipLabel: "Tip available",
    tipLabel: "Tip",
    behaviour: {
      enableRetry: true,
      allowRetryIfCorrect: false,
      enableSolutionsButton: true,
      enableCheckButton: true,
      autoCheck: false,
      caseSensitive: true,
      showSolutionsRequiresInput: true,
      separateLines: false,
      confirmCheckDialog: false,
      confirmRetryDialog: false,
      acceptSpellingErrors: false,
    },
    confirmCheck: CONFIRM_CHECK,
    confirmRetry: CONFIRM_RETRY,
    scoreBarLabel: "You got :num out of :total points",
    a11yCheck: "Check the answers. The responses will be marked as correct, incorrect, or unanswered.",
    a11yShowSolution: "Show the solution. The task will be marked with its correct solution.",
    a11yRetry: "Retry the task. Reset all responses and start the task over again.",
    a11yCheckingModeHeader: "Checking mode",
  };
}

function buildH5pJson(spec: BlanksSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.Blanks",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: BLANKS_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "fill-in-the-blanks"
  );
}

export async function buildBlanksFiles(rawSpec: BlanksSpec): Promise<BuiltFiles> {
  const spec = validateBlanks(rawSpec);
  const files = new Map(await loadVendorFiles(BLANKS_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildBlanksH5p(rawSpec: BlanksSpec): Promise<BuiltH5p> {
  const spec = validateBlanks(rawSpec);
  const { filename, files } = await buildBlanksFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
