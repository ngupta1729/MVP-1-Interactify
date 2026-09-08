import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { validateQuiz, type QuizSpec } from "./quizSpec";

/**
 * Turn a QuizSpec into a valid, self-contained .h5p package (H5P Question Set
 * made of Multiple Choice questions).
 *
 * A .h5p file is just a zip containing:
 *   - h5p.json                -> the manifest (which libraries, which version)
 *   - content/content.json    -> the actual quiz parameters
 *   - one folder per H5P library it depends on (the runtime code)
 *
 * We keep a frozen copy of the 8 runtime libraries in lib/h5p/vendor and stitch
 * our generated JSON into them. Output plays standalone and imports cleanly into
 * Lumi and h5p.com.
 */

const VENDOR_ZIP = path.join(process.cwd(), "lib", "h5p", "vendor", "h5p-libraries.zip");

// Machine name + version of every runtime library bundled in vendor/h5p-libraries.zip.
const PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.QuestionSet", majorVersion: 1, minorVersion: 20 },
  { machineName: "H5P.MultiChoice", majorVersion: 1, minorVersion: 16 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
  { machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MULTICHOICE_UI = {
  checkAnswerButton: "Check",
  showSolutionButton: "Show solution",
  tryAgainButton: "Retry",
  tipsLabel: "Show tip",
  scoreBarLabel: "You got :num out of :total points",
  tipAvailable: "Tip available",
  feedbackAvailable: "Feedback available",
  readFeedback: "Read feedback",
  wrongAnswer: "Wrong answer",
  correctAnswer: "Correct answer",
  shouldCheck: "Should have been checked",
  shouldNotCheck: "Should not have been checked",
  noInput: "Please answer before viewing the solution",
  submitAnswerButton: "Submit",
};

const CONFIRM_CHECK = {
  header: "Finish ?",
  body: "Are you sure you wish to finish ?",
  cancelLabel: "Cancel",
  confirmLabel: "Finish",
};
const CONFIRM_RETRY = {
  header: "Retry ?",
  body: "Are you sure you wish to retry ?",
  cancelLabel: "Cancel",
  confirmLabel: "Confirm",
};

function multiChoiceQuestion(q: QuizSpec["questions"][number]) {
  return {
    library: "H5P.MultiChoice 1.16",
    subContentId: randomUUID(),
    metadata: { contentType: "Multiple Choice", license: "U", title: q.question.slice(0, 60) },
    params: {
      question: `<p>${escapeHtml(q.question)}</p>\n`,
      answers: q.answers.map((a) => ({
        text: `<div>${escapeHtml(a.text)}</div>\n`,
        correct: a.correct,
        tipsAndFeedback: {
          tip: "",
          chosenFeedback: a.feedback ? `<div>${escapeHtml(a.feedback)}</div>\n` : "",
          notChosenFeedback: "",
        },
      })),
      overallFeedback: [{ from: 0, to: 100 }],
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        type: "auto",
        singlePoint: false,
        randomAnswers: true,
        showSolutionsRequiresInput: true,
        confirmCheckDialog: false,
        confirmRetryDialog: false,
        autoCheck: false,
        passPercentage: 100,
        showScorePoints: true,
      },
      UI: MULTICHOICE_UI,
      confirmCheck: CONFIRM_CHECK,
      confirmRetry: CONFIRM_RETRY,
      media: { disableImageZooming: false },
    },
  };
}

function buildContentJson(spec: QuizSpec) {
  const hasIntro = Boolean(spec.introduction && spec.introduction.trim());
  return {
    introPage: {
      showIntroPage: hasIntro,
      startButtonText: "Start Quiz",
      introduction: hasIntro ? `<p>${escapeHtml(spec.introduction!.trim())}</p>\n` : "",
      title: spec.title,
    },
    progressType: "dots",
    passPercentage: spec.passPercentage,
    questions: spec.questions.map(multiChoiceQuestion),
    disableBackwardsNavigation: false,
    randomQuestions: false,
    endGame: {
      showResultPage: true,
      showSolutionButton: true,
      noResultMessage: "Finished",
      message: "Your result:",
      overallFeedback: [{ from: 0, to: 100 }],
      solutionButtonText: "Show solution",
      retryButtonText: "Retry",
      finishButtonText: "Finish",
      showAnimations: false,
      skippable: false,
      skipButtonText: "Skip video",
      showRetryButton: true,
      scoreBarLabel: "You got @finals out of @totals points",
      submitButtonText: "Submit",
    },
    texts: {
      prevButton: "Previous question",
      nextButton: "Next question",
      finishButton: "Finish",
      textualProgress: "Question: @current of @total questions",
      jumpToQuestion: "Question %d of %total",
      questionLabel: "Question",
      readSpeakerProgress: "Question @current of @total",
      unansweredText: "Unanswered",
      answeredText: "Answered",
      currentQuestionText: "Current question",
      submitButton: "Submit",
      navigationLabel: "Questions",
    },
    override: { checkButton: true },
  };
}

function buildH5pJson(spec: QuizSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.QuestionSet",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: PRELOADED_DEPENDENCIES,
  };
}

export interface BuiltH5p {
  filename: string;
  buffer: Buffer;
  contentJson: unknown;
  h5pJson: unknown;
}

export interface BuiltFiles {
  filename: string;
  files: Map<string, Buffer>;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "quiz"
  );
}

// The vendored library files, extracted once per process.
let vendorFilesCache: Map<string, Buffer> | null = null;
async function loadVendorFiles(): Promise<Map<string, Buffer>> {
  if (vendorFilesCache) return vendorFilesCache;
  const zip = await JSZip.loadAsync(await readFile(VENDOR_ZIP));
  const files = new Map<string, Buffer>();
  await Promise.all(
    Object.values(zip.files).map(async (f) => {
      if (!f.dir) files.set(f.name, await f.async("nodebuffer"));
    }),
  );
  vendorFilesCache = files;
  return files;
}

/** The full set of files that make up the .h5p, unpacked. */
export async function buildQuizFiles(rawSpec: QuizSpec): Promise<BuiltFiles> {
  const spec = validateQuiz(rawSpec);
  const files = new Map(await loadVendorFiles());
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set(
    "content/content.json",
    Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"),
  );
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

/** Zip a set of unpacked files into a .h5p buffer. */
export async function packFiles(files: Map<string, Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, data] of files) zip.file(name, data);
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function buildQuizH5p(rawSpec: QuizSpec): Promise<BuiltH5p> {
  const spec = validateQuiz(rawSpec);
  const { filename, files } = await buildQuizFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
