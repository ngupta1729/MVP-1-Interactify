import { packFiles } from "./buildQuiz";
import { validateCrossword, type CrosswordSpec, type CrosswordWord } from "./crosswordSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a CrosswordSpec into a valid .h5p package (H5P Crossword).
 * Content shape verified against otacke/h5p-crossword's real semantics.json
 * and h5p-crossword-generator.js, not guessed - see crosswordSpec.ts for the
 * key finding that layout is computed client-side at play time.
 */

// Deps and version verified against the ACTUAL Hub-shipped bundle's
// library.json, not GitHub master (which is at 0.7; the Hub still serves
// 0.5, and 0.5 needs H5P.MaterialDesignIcons which master's deps list omits).
// H5P.JoubelUI/H5P.Question also transitively need FontAwesome,
// H5P.Transition and H5P.FontIcons (confirmed by reading their own
// library.json) - Crossword had none of these three on the first pass,
// caught by a real "Failed to fetch" in ChatGPT.
// Versions + deps verified against hub-api.h5p.org (the new-design-system
// Hub, migrated 2026-10-01 - see memory note h5p-hub-migration-deferred.md).
// H5P.Image and H5P.Question both now declare H5P.Components as a real
// dependency (new in this Hub generation), cascading to jQuery.ui.
export const CROSSWORD_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.Crossword", majorVersion: 0, minorVersion: 5 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.Image", majorVersion: 1, minorVersion: 1 },
  { machineName: "H5P.MaterialDesignIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.Components", majorVersion: 1, minorVersion: 0 },
  { machineName: "jQuery.ui", majorVersion: 1, minorVersion: 10 },
];
export const CROSSWORD_VENDOR_FOLDERS = folderNamesFor(CROSSWORD_PRELOADED_DEPENDENCIES);

function wordToContent(word: CrosswordWord) {
  return {
    clue: word.clue,
    answer: word.answer.toUpperCase(),
    fixWord: false,
    // Only consulted when fixWord is true (see crosswordSpec.ts) - inert
    // placeholders so the field is present without constraining placement.
    row: 0,
    column: 0,
    orientation: "across" as const,
  };
}

function buildContentJson(spec: CrosswordSpec) {
  return {
    taskDescription: spec.taskDescription ?? "",
    words: spec.words.map(wordToContent),
    theme: {
      backgroundColor: "#173354",
    },
    behaviour: {
      enableInstantFeedback: false,
      scoreWords: true,
      applyPenalties: false,
      enableRetry: true,
      enableSolutionsButton: true,
      keepCorrectAnswers: false,
      addExtraMarkerForEmptyCells: false,
    },
    l10n: {
      across: "Across",
      down: "Down",
      checkAnswer: "Check",
      submitAnswer: "Submit",
      tryAgain: "Retry",
      showSolution: "Show solution",
      couldNotGenerateCrossword:
        "Could not generate a crossword with the given words. Please try again with fewer words or words that have more characters in common.",
      couldNotGenerateCrosswordTooFewWords: "Could not generate a crossword. You need at least two words.",
      probematicWords:
        "Some words could not be placed. If you are using fixed words, please make sure that their position doesn't prevent other words from being placed. Words with the same alignment may not be placed touching each other. Problematic word(s): @words",
      extraClue: "Extra clue",
      closeWindow: "Close window",
    },
    a11y: {
      crosswordGrid:
        "Crossword grid. Use arrow keys to navigate and the keyboard to enter characters. Alternatively, use Tab to navigate to type the answers in Fill in the Blanks style fields instead of the grid.",
      column: "Column",
      row: "Row",
      across: "Across",
      down: "Down",
      empty: "Empty",
      resultFor: "Result for: @clue",
      correct: "Correct",
      wrong: "Wrong",
      point: "point",
      solutionFor: "For @clue the solution is: @solution",
      extraClueFor: "Open extra clue for @clue",
      letterSevenOfNine: "Letter @position of @length",
      lettersWord: "@length letter word",
      check: "Check the characters. The responses will be marked as correct, incorrect, or unanswered.",
      submitAndcheck: "Submit the answer and check the characters. The responses will be marked as correct, incorrect, or unanswered.",
      showSolution: "Show the solution. The crossword will be filled with its correct solution.",
      retry: "Retry the task. Reset all responses and start the task over again.",
    },
  };
}

function buildH5pJson(spec: CrosswordSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.Crossword",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: CROSSWORD_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "crossword"
  );
}

export async function buildCrosswordFiles(rawSpec: CrosswordSpec): Promise<BuiltFiles> {
  const spec = validateCrossword(rawSpec);
  const files = new Map(await loadVendorFiles(CROSSWORD_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildCrosswordH5p(rawSpec: CrosswordSpec): Promise<BuiltH5p> {
  const spec = validateCrossword(rawSpec);
  const { filename, files } = await buildCrosswordFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
