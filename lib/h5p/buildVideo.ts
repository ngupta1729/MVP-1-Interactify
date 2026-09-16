import { randomUUID } from "node:crypto";
import { escapeHtml, packFiles } from "./buildQuiz";
import { checkpointContentBlock } from "./buildQuestions";
import { validateVideo, type VideoSpec, type TimelineItem } from "./videoSpec";
import { loadVendorFiles, folderNamesFor } from "./vendor";
import type { BuiltFiles, BuiltH5p } from "./buildQuiz";

/**
 * Turn a VideoSpec into a valid, self-contained .h5p package (H5P Interactive
 * Video: a YouTube-sourced video with timed text/question overlays).
 *
 * Same shape as buildQuiz.ts/buildBook.ts: h5p.json manifest +
 * content/content.json + vendored runtime libraries, zipped.
 *
 * v1 simplification: every interaction is placed at a fixed screen position
 * (x:15, y:75). If two interactions' time windows overlap they'd visually
 * stack - cosmetic, not a correctness bug.
 */

export const VIDEO_PRELOADED_DEPENDENCIES = [
  { machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27 },
  { machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 },
  { machineName: "H5P.DragNBar", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.DragNDrop", majorVersion: 1, minorVersion: 1 },
  { machineName: "H5P.DragNResize", majorVersion: 1, minorVersion: 2 },
  { machineName: "jQuery.ui", majorVersion: 1, minorVersion: 10 },
  { machineName: "H5P.Text", majorVersion: 1, minorVersion: 1 },
  { machineName: "H5P.TrueFalse", majorVersion: 1, minorVersion: 8 },
  { machineName: "H5P.MultiChoice", majorVersion: 1, minorVersion: 16 },
  { machineName: "H5P.Question", majorVersion: 1, minorVersion: 5 },
  { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
  { machineName: "H5P.Transition", majorVersion: 1, minorVersion: 0 },
  { machineName: "H5P.FontIcons", majorVersion: 1, minorVersion: 0 },
  { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
];
export const VIDEO_VENDOR_FOLDERS = folderNamesFor(VIDEO_PRELOADED_DEPENDENCIES);

const IV_L10N = {
  interaction: "Interaction",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  quality: "Video quality",
  captions: "Captions",
  close: "Close",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
  summary: "Open summary dialog",
  bookmarks: "Bookmarks",
  defaultAdaptivitySeekLabel: "Continue",
  continueWithVideo: "Continue with video",
  more: "More player options",
  reset: "Reset",
  rewind10: "Rewind 10 seconds",
  navDisabled: "Navigation is disabled",
  navForwardDisabled: "Navigating forward is disabled",
  sndDisabled: "Sound is disabled",
  requiresCompletionWarning: "You need to answer all the questions correctly before continuing.",
  back: "Back",
  hup: "Sorry, something went wrong.",
  buttonToggleInteractionMenu: "Toggle interaction menu",
  videoPause: "Video pause",
  content: "Content",
  answered: "Answered",
  endscreenTitle: "Submit Screen",
  endscreenAlreadySubmitted: "You have already submitted your answers.",
  defaultAdaptivitySeekLabelPlaceholder: "@seekTime",
  totalScoreLabel: "Total score",
  answeredScoreLabel: "Answered score",
  summaryStatisticsTitle: "Summary Statistics",
};

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "video"
  );
}

function timelineToInteraction(item: TimelineItem) {
  const base = {
    x: 15,
    y: 75,
    width: 10,
    height: 10,
    duration: { from: item.timestampSeconds, to: item.timestampSeconds + 6 },
    pause: false,
    displayType: "button" as const,
    buttonOnMobile: false,
    label: "",
  };

  if (item.kind === "text") {
    return {
      ...base,
      libraryTitle: "Text",
      action: {
        library: "H5P.Text 1.1",
        subContentId: randomUUID(),
        metadata: { contentType: "Text", license: "U", title: item.title || "Note" },
        params: { text: `<p>${escapeHtml(item.body)}</p>\n` },
      },
    };
  }

  return {
    ...base,
    pause: item.pauseVideo,
    libraryTitle: item.question.type === "truefalse" ? "True/False Question" : "Multiple Choice",
    action: checkpointContentBlock(item.question),
  };
}

function buildContentJson(spec: VideoSpec) {
  return {
    interactiveVideo: {
      video: {
        startScreenOptions: { title: spec.title, hideStartTitle: false },
        textTracks: { videoTrack: [] },
        files: [{ path: spec.youtubeUrl, mime: "video/YouTube", copyright: { license: "U" } }],
      },
      assets: {
        interactions: spec.timeline.map(timelineToInteraction),
        endscreens: [],
      },
    },
    override: {
      autoplay: false,
      loop: false,
      showBookmarksmenuOnLoad: false,
      showRewind10: false,
      deactivateSound: false,
      preventSkippingMode: "none",
    },
    l10n: IV_L10N,
  };
}

function buildH5pJson(spec: VideoSpec) {
  return {
    title: spec.title,
    language: "en",
    mainLibrary: "H5P.InteractiveVideo",
    embedTypes: ["div"],
    license: "U",
    defaultLanguage: "en",
    preloadedDependencies: VIDEO_PRELOADED_DEPENDENCIES,
  };
}

export async function buildVideoFiles(rawSpec: VideoSpec): Promise<BuiltFiles> {
  const spec = validateVideo(rawSpec);
  const files = new Map(await loadVendorFiles(VIDEO_VENDOR_FOLDERS));
  files.set("h5p.json", Buffer.from(JSON.stringify(buildH5pJson(spec)), "utf8"));
  files.set("content/content.json", Buffer.from(JSON.stringify(buildContentJson(spec)), "utf8"));
  return { filename: `${slugify(spec.title)}.h5p`, files };
}

export async function buildVideoH5p(rawSpec: VideoSpec): Promise<BuiltH5p> {
  const spec = validateVideo(rawSpec);
  const { filename, files } = await buildVideoFiles(spec);
  return {
    filename,
    buffer: await packFiles(files),
    contentJson: JSON.parse(files.get("content/content.json")!.toString("utf8")),
    h5pJson: JSON.parse(files.get("h5p.json")!.toString("utf8")),
  };
}
