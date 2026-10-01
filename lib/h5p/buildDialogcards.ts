import { escapeHtml, packFiles } from "./buildQuiz";
import { validateDialogcards, type DialogcardsSpec, type Card } from "./dialogcardsSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a DialogcardsSpec into a valid .h5p package (H5P Dialog Cards).
 * Content shape and l10n defaults verified against h5p/h5p-dialogcards'
 * real semantics.json, not guessed.
 */

// H5P.JoubelUI itself depends on H5P.Transition and H5P.FontIcons (confirmed
// by reading its own real library.json) - since we hand-build h5p.json with
// no H5P editor doing automatic dependency resolution for us, every library
// that uses JoubelUI must also declare JoubelUI's own transitive deps itself,
// or the player 404s trying to fetch them. Missed on the first pass; caught
// by a real "Failed to fetch"/404 in ChatGPT, not by the smoke test (which
// only checks OUR OWN declared deps are bundled, not what the libraries
// themselves actually need at runtime).
export const DIALOGCARDS_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.Dialogcards", majorVersion: 1, minorVersion: 9 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.Audio", majorVersion: 1, minorVersion: 5 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
];
export const DIALOGCARDS_VENDOR_FOLDERS = folderNamesFor(DIALOGCARDS_PRELOADED_DEPENDENCIES);

function cardToContent(card: Card) {
  return {
    text: `<p style="text-align: center;">${escapeHtml(card.front)}</p>\n`,
    answer: `<p style="text-align: center;">${escapeHtml(card.back)}</p>\n`,
  };
}

function buildContentJson(spec: DialogcardsSpec) {
  return {
    title: spec.title,
    mode: "normal",
    description: spec.description ?? "",
    dialogs: spec.cards.map(cardToContent),
    behaviour: {
      enableRetry: true,
      disableBackwardsNavigation: false,
      scaleTextNotCard: false,
      randomCards: false,
      maxProficiency: 5,
      quickProgression: false,
    },
    answer: "Turn",
    next: "Next",
    prev: "Previous",
    retry: "Retry",
    correctAnswer: "I got it right!",
    incorrectAnswer: "I got it wrong",
    round: "Round @round",
    cardsLeft: "Cards left: @number",
    nextRound: "Proceed to round @round",
    startOver: "Start over",
    showSummary: "Next",
    summary: "Summary",
    summaryCardsRight: "Cards you got right:",
    summaryCardsWrong: "Cards you got wrong:",
    summaryCardsNotShown: "Cards in pool not shown:",
    summaryOverallScore: "Overall Score",
    summaryCardsCompleted: "Cards you have completed learning:",
    summaryCompletedRounds: "Completed rounds:",
    summaryAllDone: "Well done! You have mastered all @cards cards by getting them correct @max times!",
    progressText: "Card @card of @total",
    cardFrontLabel: "Card front",
    cardBackLabel: "Card back",
    tipButtonLabel: "Show tip",
    audioNotSupported: "Your browser does not support this audio",
    confirmStartingOver: {
      header: "Start over?",
      body: "All progress will be lost. Are you sure you want to start over?",
      cancelLabel: "Cancel",
      confirmLabel: "Start over",
    },
  };
}

function buildH5pJson(spec: DialogcardsSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.Dialogcards",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: DIALOGCARDS_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "dialog-cards"
  );
}

export async function buildDialogcardsFiles(rawSpec: DialogcardsSpec): Promise<BuiltFiles> {
  const spec = validateDialogcards(rawSpec);
  const files = new Map(await loadVendorFiles(DIALOGCARDS_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildDialogcardsH5p(rawSpec: DialogcardsSpec): Promise<BuiltH5p> {
  const spec = validateDialogcards(rawSpec);
  const { filename, files } = await buildDialogcardsFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
