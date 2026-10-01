import { packFiles } from "./buildQuiz";
import { validateSinglechoiceset, type SinglechoicesetSpec, type ChoiceQuestion } from "./singlechoicesetSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a SinglechoicesetSpec into a valid .h5p package (H5P Single Choice
 * Set). Content shape and l10n defaults verified against
 * h5p/h5p-single-choice-set's real semantics.json, not guessed.
 */

// H5P.JoubelUI/H5P.Question also transitively need H5P.FontIcons (confirmed
// by reading their own library.json) - missed on the first pass (Transition
// was already here, FontIcons wasn't), caught by a real "Failed to fetch"
// in ChatGPT.
// Versions + deps verified against hub-api.h5p.org (the new-design-system
// Hub, migrated 2026-10-01 - see memory note h5p-hub-migration-deferred.md).
export const SINGLE_CHOICE_SET_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.SingleChoiceSet", majorVersion: 1, minorVersion: 11 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.Components", majorVersion: 1, minorVersion: 0 },
  { machineName: "jQuery.ui", majorVersion: 1, minorVersion: 10 },
];
export const SINGLE_CHOICE_SET_VENDOR_FOLDERS = folderNamesFor(SINGLE_CHOICE_SET_PRELOADED_DEPENDENCIES);

function choiceToContent(cq: ChoiceQuestion) {
  return {
    question: cq.question,
    answers: cq.answers,
  };
}

function buildContentJson(spec: SinglechoicesetSpec) {
  return {
    choices: spec.choices.map(choiceToContent),
    behaviour: {
      autoContinue: true,
      timeoutCorrect: 2000,
      timeoutWrong: 3000,
      soundEffectsEnabled: true,
      enableRetry: true,
      enableSolutionsButton: true,
      passPercentage: 100,
    },
    l10n: {
      nextButtonLabel: "Next question",
      nextButton: "Next",
      showResultsButtonLabel: "Show results",
      retryButtonLabel: "Retry",
      solutionViewTitle: "Solution list",
      correctText: "Correct!",
      incorrectText: "Incorrect!",
      shouldSelect: "Should have been selected",
      shouldNotSelect: "Should not have been selected",
      muteButtonLabel: "Mute feedback sound",
      closeButtonLabel: "Close",
      slideOfTotal: "Slide :num of :total",
      scoreBarLabel: "You got :num out of :total points",
      solutionListQuestionNumber: "Question :num",
      a11yShowSolution: "Show the solution. The task will be marked with its correct solution.",
      a11yRetry: "Retry the task. Reset all responses and start the task over again.",
      resultHeader: "Your result:",
      totalScore: ":score of :maxScore correct",
      resultTableHeader: "Question",
      resultScoreTableHeader: "Score",
      correctAnswerIntroduction: "Correct answer",
    },
  };
}

function buildH5pJson(spec: SinglechoicesetSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.SingleChoiceSet",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: SINGLE_CHOICE_SET_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "single-choice-set"
  );
}

export async function buildSingleChoiceSetFiles(rawSpec: SinglechoicesetSpec): Promise<BuiltFiles> {
  const spec = validateSinglechoiceset(rawSpec);
  const files = new Map(await loadVendorFiles(SINGLE_CHOICE_SET_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildSingleChoiceSetH5p(rawSpec: SinglechoicesetSpec): Promise<BuiltH5p> {
  const spec = validateSinglechoiceset(rawSpec);
  const { filename, files } = await buildSingleChoiceSetFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
