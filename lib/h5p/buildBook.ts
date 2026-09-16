import { randomUUID } from "node:crypto";
import { escapeHtml, packFiles } from "./buildQuiz";
import { checkpointContentBlock } from "./buildQuestions";
import { validateBook, type BookSpec, type Chapter } from "./bookSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a BookSpec into a valid, self-contained .h5p package (H5P Interactive
 * Book: chapters of H5P.Column, each holding H5P.AdvancedText blocks plus an
 * optional checkpoint question).
 *
 * Same shape as buildQuiz.ts: h5p.json manifest + content/content.json +
 * vendored runtime libraries, zipped. Text-only for v1 - no cover image, no
 * embedded images in chapters.
 */

export const BOOK_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.InteractiveBook", majorVersion: 1, minorVersion: 11 },
  { machineName: "H5P.Column", majorVersion: 1, minorVersion: 18 },
  { machineName: "H5P.AdvancedText", majorVersion: 1, minorVersion: 1 },
  { machineName: "H5P.TrueFalse", majorVersion: 1, minorVersion: 8 },
  { machineName: "H5P.MultiChoice", majorVersion: 1, minorVersion: 16 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
];
export const BOOK_VENDOR_FOLDERS = folderNamesFor(BOOK_PRELOADED_DEPENDENCIES);

function advancedTextBlock(html: string) {
  return {
    library: "H5P.AdvancedText 1.1",
    subContentId: randomUUID(),
    metadata: { contentType: "Text", license: "U", title: "Text" },
    params: { text: html },
  };
}

function chapterToColumn(chapter: Chapter) {
  const blocks = [
    { useSeparator: "auto", content: advancedTextBlock(`<h2>${escapeHtml(chapter.heading)}</h2>\n`) },
    ...chapter.bodyParagraphs.map((p) => ({
      useSeparator: "auto",
      content: advancedTextBlock(`<p>${escapeHtml(p)}</p>\n`),
    })),
    ...(chapter.checkpoint ? [{ useSeparator: "auto", content: checkpointContentBlock(chapter.checkpoint) }] : []),
  ];
  return {
    library: "H5P.Column 1.18",
    subContentId: randomUUID(),
    metadata: { contentType: "Column", license: "U", title: chapter.heading.slice(0, 60), defaultLanguage: "en" },
    params: { content: blocks },
  };
}

function buildContentJson(spec: BookSpec) {
  return {
    showCoverPage: false,
    chapters: spec.chapters.map(chapterToColumn),
    behaviour: {
      defaultTableOfContents: true,
      progressIndicators: true,
      progressAuto: true,
      displaySummary: true,
      baseColor: "#1a73d9",
    },
    read: "Read",
    displayTOC: "Display Table of Contents",
    hideTOC: "Hide Table of Contents",
    nextPage: "Next page",
    previousPage: "Previous page",
    chapterCompleted: "Chapter completed!",
    partCompleted: "Part @part of @total completed",
    incompleteChapter: "Incomplete chapter",
    navigateToTop: "Navigate to the top",
    markAsFinished: "I have finished this chapter",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit fullscreen",
    bookProgressSubtext: "@count of @total pages",
    interactionsProgressSubtext: "@count of @total interactions",
    submitReport: "Submit Report",
    restartLabel: "Restart",
    summaryHeader: "Summary",
    allInteractions: "All interactions",
    unansweredInteractions: "Unanswered interactions",
    scoreText: "@score / @maxscore",
    leftOutOfTotalCompleted: "@left of @max chapters completed",
    noInteractions: "No interactions",
    score: "Score",
    summaryAndSubmit: "Summary & Submit",
    noChapterInteractionBoldText: "You have not interacted with any chapters.",
    noChapterInteractionText: "You have to answer the questions before you can see your summary.",
    yourAnswersAreSubmittedForReview: "Your answers are submitted for review!",
    bookProgress: "Book progress",
    interactionsProgress: "Interactions progress",
    a11y: {
      progress: "Page @page of @total",
      menu: "Toggle navigation menu",
    },
    totalScoreLabel: "Total score",
  };
}

function buildH5pJson(spec: BookSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.InteractiveBook",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: BOOK_PRELOADED_DEPENDENCIES,
  };
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "book"
  );
}

export async function buildBookFiles(rawSpec: BookSpec): Promise<BuiltFiles> {
  const spec = validateBook(rawSpec);
  const files = new Map(await loadVendorFiles(BOOK_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildBookH5p(rawSpec: BookSpec): Promise<BuiltH5p> {
  const spec = validateBook(rawSpec);
  const { filename, files } = await buildBookFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
