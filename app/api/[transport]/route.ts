import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { quizSpecShape, quizSpecSchema } from "@/lib/h5p/quizSpec";
import { bookSpecShape, bookSpecSchema } from "@/lib/h5p/bookSpec";
import { videoSpecShape, videoSpecSchema } from "@/lib/h5p/videoSpec";
import { accordionSpecShape, accordionSpecSchema } from "@/lib/h5p/accordionSpec";
import { dialogcardsSpecShape, dialogcardsSpecSchema } from "@/lib/h5p/dialogcardsSpec";
import { blanksSpecShape, blanksSpecSchema } from "@/lib/h5p/blanksSpec";
import { dragtextSpecShape, dragtextSpecSchema } from "@/lib/h5p/dragtextSpec";
import { singlechoicesetSpecShape, singlechoicesetSpecSchema } from "@/lib/h5p/singlechoicesetSpec";
import { crosswordSpecShape, crosswordSpecSchema } from "@/lib/h5p/crosswordSpec";
import { dragquestionSpecShape, dragquestionSpecSchema } from "@/lib/h5p/dragquestionSpec";
import { encodeSpec, decodeSpec, warmCache, type ContentSpec } from "@/lib/h5p/pack";
import { buildQuizFiles } from "@/lib/h5p/buildQuiz";
import { buildBookFiles } from "@/lib/h5p/buildBook";
import { buildVideoFiles } from "@/lib/h5p/buildVideo";
import { buildAccordionFiles } from "@/lib/h5p/buildAccordion";
import { buildDialogcardsFiles } from "@/lib/h5p/buildDialogcards";
import { buildBlanksFiles } from "@/lib/h5p/buildBlanks";
import { buildDragTextFiles } from "@/lib/h5p/buildDragText";
import { buildSingleChoiceSetFiles } from "@/lib/h5p/buildSingleChoiceSet";
import { buildCrosswordFiles } from "@/lib/h5p/buildCrossword";
import { buildDragQuestionFiles } from "@/lib/h5p/buildDragQuestion";
import { classifyRefinement } from "@/lib/h5p/diffQuiz";
import { checkGenerationRateLimit, checkRateLimitOrReject } from "@/lib/h5p/rateLimit";
import { QUIZ_WIDGET_HTML } from "@/lib/h5p/widget";
import { buildPlayerWidgetHtml } from "@/lib/h5p/genericPlayerWidget";
import { baseUrl } from "@/lib/baseUrl";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { deriveAnonUid } from "@/lib/db/anon";

const BOOK_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "book",
  label: "book",
  metaLabel: "H5P Interactive Book",
  successSelectors: ".h5p-interactive-book, .h5p-column, .h5p-book-chapter",
});
const VIDEO_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "video",
  label: "video",
  metaLabel: "H5P Interactive Video",
  successSelectors: ".h5p-interactive-video, .h5p-video-wrapper",
  // ChatGPT's widget CSP cannot be extended to allow youtube.com's iframe_api
  // script (confirmed live: it's a fixed platform allowlist) - the YouTube
  // player can never load inline here, so don't try. See genericPlayerWidget.ts.
  supportsInlineMount: false,
});
const ACCORDION_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "accordion",
  label: "accordion",
  metaLabel: "H5P Accordion",
  successSelectors: ".h5p-accordion",
});
const DIALOGCARDS_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "dialogcards",
  label: "dialog cards",
  metaLabel: "H5P Dialog Cards",
  successSelectors: ".h5p-dialogcards",
  // H5P.Dialogcards' own card-sizing routine (dist/h5p-dialogcards.js, the
  // Hub-shipped 1.9.18 build) measures each card's DOM via
  // getBoundingClientRect() with no guard against the element not being
  // attached yet - confirmed by reading its real source, reproduced live in
  // ChatGPT as "Cannot read properties of undefined (reading
  // 'getBoundingClientRect')". This happens inside the library's own first
  // render pass under div embedType, independent of our content - same
  // category as Video's YouTube CSP block (an upstream constraint, not
  // something our content.json can route around), so same fix: skip the
  // inline-mount attempt and go straight to the clean fallback instead of
  // attempting-then-crashing.
  supportsInlineMount: false,
});
const BLANKS_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "blanks",
  label: "activity",
  metaLabel: "H5P Fill in the Blanks",
  successSelectors: ".h5p-blanks, .h5p-question",
});
const DRAGTEXT_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "dragtext",
  label: "activity",
  metaLabel: "H5P Drag the Words",
  successSelectors: ".h5p-drag-text, .h5p-question",
});
const SINGLE_CHOICE_SET_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "singlechoiceset",
  label: "activity",
  metaLabel: "H5P Single Choice Set",
  successSelectors: ".h5p-single-choice-set, .h5p-question",
});
const CROSSWORD_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "crossword",
  label: "crossword",
  metaLabel: "H5P Crossword",
  successSelectors: ".h5p-crossword",
});
const DRAGQUESTION_WIDGET_HTML = buildPlayerWidgetHtml({
  kind: "dragquestion",
  label: "activity",
  metaLabel: "H5P Drag and Drop",
  successSelectors: ".h5p-dragquestion, .h5p-question",
});

/**
 * Shared completion logic for the MVP 4 content types (Accordion, Dialog
 * Cards, Fill in the Blanks, Drag the Words, Single Choice Set, Crossword,
 * Drag and Drop) - all of them render via the generic player widget and
 * share the exact plumbing quiz/book/video each wrote out by hand (encode +
 * warm the cache, log a generate/refinement event, build the MCP-UI iframe
 * resource, decide what the reply text says). Factored out once there were
 * 7 near-identical copies to write, rather than inlining a 60-line block
 * seven more times - quiz/book/video predate this and are left as they are.
 */
async function finishContentToolCall<S extends { title: string }>(opts: {
  kind: ContentSpec["kind"];
  spec: S;
  buildFiles: (spec: S) => Promise<{ filename: string; files: Map<string, Buffer> }>;
  widgetUri: string;
  metaLine: string;
  extraStructured: Record<string, unknown>;
  anonUid: string | null;
  previousToken?: string;
  refinementNote?: string;
  toolLabel: string;
}) {
  const built = await opts.buildFiles(opts.spec);
  const token = encodeSpec({ kind: opts.kind, spec: opts.spec } as unknown as ContentSpec);
  warmCache(token, built);
  const base = baseUrl();
  const downloadUrl = `${base}/api/h5p/${token}`;
  const playUrl = `${base}/play/${token}`;

  try {
    if (opts.previousToken) {
      await getDb()
        .insert(events)
        .values({
          quizToken: token,
          eventType: "refinement",
          anonUid: opts.anonUid,
          detail: JSON.stringify({ previousToken: opts.previousToken, refinementNote: opts.refinementNote ?? null }),
        });
    } else {
      await getDb().insert(events).values({ quizToken: token, eventType: "generate", anonUid: opts.anonUid });
    }
  } catch (err) {
    console.error(`${opts.toolLabel}: failed to log usage`, err);
  }

  const structured = {
    title: opts.spec.title,
    meta: opts.metaLine,
    token,
    appOrigin: base,
    filename: built.filename,
    anonUid: opts.anonUid,
    ...opts.extraStructured,
  };

  const uiResource = {
    type: "resource" as const,
    resource: {
      uri: `ui://h5p-${opts.kind}/${token}`,
      mimeType: "text/html",
      text:
        `<!doctype html><html><head><meta charset="utf-8">` +
        `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}</style>` +
        `</head><body><iframe src="${playUrl}" allowfullscreen></iframe></body></html>`,
    },
  };

  const summary = `Built "${opts.spec.title}" - ${opts.metaLine}.`;
  const text = opts.anonUid ? summary : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}`;

  return {
    content: [{ type: "text" as const, text }, uiResource],
    structuredContent: structured,
    _meta: { "openai/outputTemplate": opts.widgetUri },
  };
}

export const runtime = "nodejs";
export const maxDuration = 60;

// Bump the version segment whenever the widget HTML changes — ChatGPT caches
// component templates by URI, so a new URI forces a re-fetch.
const WIDGET_URI = "ui://widget/quiz-v27.html";
// URIs used by earlier builds. Old chats bound their card to one of these; keep
// serving the current HTML at each so those cards re-render instead of going blank.
const LEGACY_WIDGET_URIS = [
  "ui://widget/quiz.html",
  "ui://widget/quiz-v3.html",
  "ui://widget/quiz-v4.html",
  "ui://widget/quiz-v5.html",
  "ui://widget/quiz-v6.html",
  "ui://widget/quiz-v7.html",
  "ui://widget/quiz-v8.html",
  "ui://widget/quiz-v9.html",
  "ui://widget/quiz-v10.html",
  "ui://widget/quiz-v11.html",
  "ui://widget/quiz-v12.html",
  "ui://widget/quiz-v13.html",
  "ui://widget/quiz-v14.html",
  "ui://widget/quiz-v15.html",
  "ui://widget/quiz-v16.html",
  "ui://widget/quiz-v17.html",
  "ui://widget/quiz-v18.html",
  "ui://widget/quiz-v19.html",
  "ui://widget/quiz-v20.html",
  "ui://widget/quiz-v21.html",
  "ui://widget/quiz-v22.html",
  "ui://widget/quiz-v23.html",
  "ui://widget/quiz-v24.html",
  "ui://widget/quiz-v25.html",
  "ui://widget/quiz-v26.html",
];
// Bump the version segment whenever BOOK_WIDGET_HTML/VIDEO_WIDGET_HTML change —
// same reasoning as the quiz widget's WIDGET_URI above. ChatGPT caches component
// templates by URI, not by content, so an unchanged URI serves stale HTML even
// after this server has been redeployed with new widget code.
const BOOK_WIDGET_URI = "ui://widget/book-v7.html";
const VIDEO_WIDGET_URI = "ui://widget/video-v7.html";
const LEGACY_BOOK_WIDGET_URIS = ["ui://widget/book-v1.html", "ui://widget/book-v2.html", "ui://widget/book-v3.html", "ui://widget/book-v4.html", "ui://widget/book-v5.html", "ui://widget/book-v6.html"];
const LEGACY_VIDEO_WIDGET_URIS = ["ui://widget/video-v1.html", "ui://widget/video-v2.html", "ui://widget/video-v3.html", "ui://widget/video-v4.html", "ui://widget/video-v5.html", "ui://widget/video-v6.html"];
// MVP 4 types: bumped from v1 to v2 for the "no player URL" race-condition
// fix (body() now withholds the Open button until data is complete) -
// legacy alias so cards already open in a chat from before this fix don't
// go blank.
const ACCORDION_WIDGET_URI = "ui://widget/accordion-v3.html";
const DIALOGCARDS_WIDGET_URI = "ui://widget/dialogcards-v3.html";
const BLANKS_WIDGET_URI = "ui://widget/blanks-v3.html";
const DRAGTEXT_WIDGET_URI = "ui://widget/dragtext-v3.html";
const SINGLE_CHOICE_SET_WIDGET_URI = "ui://widget/singlechoiceset-v3.html";
const CROSSWORD_WIDGET_URI = "ui://widget/crossword-v3.html";
const DRAGQUESTION_WIDGET_URI = "ui://widget/dragquestion-v3.html";
const LEGACY_ACCORDION_WIDGET_URIS = ["ui://widget/accordion-v1.html", "ui://widget/accordion-v2.html"];
const LEGACY_DIALOGCARDS_WIDGET_URIS = ["ui://widget/dialogcards-v1.html", "ui://widget/dialogcards-v2.html"];
const LEGACY_BLANKS_WIDGET_URIS = ["ui://widget/blanks-v1.html", "ui://widget/blanks-v2.html"];
const LEGACY_DRAGTEXT_WIDGET_URIS = ["ui://widget/dragtext-v1.html", "ui://widget/dragtext-v2.html"];
const LEGACY_SINGLE_CHOICE_SET_WIDGET_URIS = ["ui://widget/singlechoiceset-v1.html", "ui://widget/singlechoiceset-v2.html"];
const LEGACY_CROSSWORD_WIDGET_URIS = ["ui://widget/crossword-v1.html", "ui://widget/crossword-v2.html"];
const LEGACY_DRAGQUESTION_WIDGET_URIS = ["ui://widget/dragquestion-v1.html", "ui://widget/dragquestion-v2.html"];
const APP_ORIGIN = new URL(baseUrl()).origin;

// Lets the ChatGPT widget load the h5p-standalone runtime + package files from our
// origin even when "Enforce CSP in developer mode" is on. resource_domains covers
// script-src (h5p-standalone bundles + library JS/CSS); connect_domains covers the
// content.json fetch. Quiz/Book render with embedType "div" and no nested iframe,
// so frame_domains stays empty for them. Declared in both the legacy snake_case key
// and the newer _meta.ui.csp shape.
const CSP_DOMAINS = { connect: [APP_ORIGIN], resource: [APP_ORIGIN] };
const WIDGET_CSP = {
  "openai/widgetCSP": {
    connect_domains: CSP_DOMAINS.connect,
    resource_domains: CSP_DOMAINS.resource,
  },
  ui: {
    csp: {
      connectDomains: CSP_DOMAINS.connect,
      resourceDomains: CSP_DOMAINS.resource,
    },
  },
};

// H5P.InteractiveVideo embeds a real YouTube player, which is itself a nested
// iframe from youtube.com - the only one of our 3 content types that needs a
// frame permission at all. Without this, the YouTube embed has no CSP grant to
// load in, and the video area renders blank.
const YOUTUBE_FRAME_DOMAINS = ["https://www.youtube.com", "https://www.youtube-nocookie.com"];
const VIDEO_WIDGET_CSP = {
  "openai/widgetCSP": {
    connect_domains: CSP_DOMAINS.connect,
    resource_domains: CSP_DOMAINS.resource,
    frame_domains: YOUTUBE_FRAME_DOMAINS,
  },
  ui: {
    csp: {
      connectDomains: CSP_DOMAINS.connect,
      resourceDomains: CSP_DOMAINS.resource,
      frameDomains: YOUTUBE_FRAME_DOMAINS,
    },
  },
};

const handler = createMcpHandler(
  (server) => {
    // The component ChatGPT renders inline after the tool runs.
    server.registerResource(
      "quiz-widget",
      WIDGET_URI,
      { title: "H5P quiz preview", mimeType: "text/html+skybridge", _meta: WIDGET_CSP },
      async () => ({
        contents: [
          {
            uri: WIDGET_URI,
            mimeType: "text/html+skybridge",
            text: QUIZ_WIDGET_HTML,
            _meta: WIDGET_CSP,
          },
        ],
      }),
    );

    server.registerResource(
      "book-widget",
      BOOK_WIDGET_URI,
      { title: "H5P book preview", mimeType: "text/html+skybridge", _meta: WIDGET_CSP },
      async () => ({
        contents: [
          { uri: BOOK_WIDGET_URI, mimeType: "text/html+skybridge", text: BOOK_WIDGET_HTML, _meta: WIDGET_CSP },
        ],
      }),
    );

    server.registerResource(
      "video-widget",
      VIDEO_WIDGET_URI,
      { title: "H5P video preview", mimeType: "text/html+skybridge", _meta: VIDEO_WIDGET_CSP },
      async () => ({
        contents: [
          { uri: VIDEO_WIDGET_URI, mimeType: "text/html+skybridge", text: VIDEO_WIDGET_HTML, _meta: VIDEO_WIDGET_CSP },
        ],
      }),
    );

    const MVP4_WIDGETS: { name: string; uri: string; title: string; html: string; legacyUris: string[] }[] = [
      { name: "accordion-widget", uri: ACCORDION_WIDGET_URI, title: "H5P accordion preview", html: ACCORDION_WIDGET_HTML, legacyUris: LEGACY_ACCORDION_WIDGET_URIS },
      { name: "dialogcards-widget", uri: DIALOGCARDS_WIDGET_URI, title: "H5P dialog cards preview", html: DIALOGCARDS_WIDGET_HTML, legacyUris: LEGACY_DIALOGCARDS_WIDGET_URIS },
      { name: "blanks-widget", uri: BLANKS_WIDGET_URI, title: "H5P fill in the blanks preview", html: BLANKS_WIDGET_HTML, legacyUris: LEGACY_BLANKS_WIDGET_URIS },
      { name: "dragtext-widget", uri: DRAGTEXT_WIDGET_URI, title: "H5P drag the words preview", html: DRAGTEXT_WIDGET_HTML, legacyUris: LEGACY_DRAGTEXT_WIDGET_URIS },
      { name: "singlechoiceset-widget", uri: SINGLE_CHOICE_SET_WIDGET_URI, title: "H5P single choice set preview", html: SINGLE_CHOICE_SET_WIDGET_HTML, legacyUris: LEGACY_SINGLE_CHOICE_SET_WIDGET_URIS },
      { name: "crossword-widget", uri: CROSSWORD_WIDGET_URI, title: "H5P crossword preview", html: CROSSWORD_WIDGET_HTML, legacyUris: LEGACY_CROSSWORD_WIDGET_URIS },
      { name: "dragquestion-widget", uri: DRAGQUESTION_WIDGET_URI, title: "H5P drag and drop preview", html: DRAGQUESTION_WIDGET_HTML, legacyUris: LEGACY_DRAGQUESTION_WIDGET_URIS },
    ];
    MVP4_WIDGETS.forEach(({ name, uri, title, html, legacyUris }) => {
      server.registerResource(
        name,
        uri,
        { title, mimeType: "text/html+skybridge", _meta: WIDGET_CSP },
        async () => ({
          contents: [{ uri, mimeType: "text/html+skybridge", text: html, _meta: WIDGET_CSP }],
        }),
      );
      legacyUris.forEach((legacyUri, i) => {
        server.registerResource(
          `${name}-legacy-${i}`,
          legacyUri,
          { title, mimeType: "text/html+skybridge", _meta: WIDGET_CSP },
          async () => ({
            contents: [{ uri: legacyUri, mimeType: "text/html+skybridge", text: html, _meta: WIDGET_CSP }],
          }),
        );
      });
    });

    // Same widget, served at the URIs older builds used, so previously rendered
    // cards in existing chats don't go blank after a version bump.
    LEGACY_WIDGET_URIS.forEach((uri, i) => {
      server.registerResource(
        `quiz-widget-legacy-${i}`,
        uri,
        { title: "H5P quiz preview", mimeType: "text/html+skybridge", _meta: WIDGET_CSP },
        async () => ({
          contents: [
            { uri, mimeType: "text/html+skybridge", text: QUIZ_WIDGET_HTML, _meta: WIDGET_CSP },
          ],
        }),
      );
    });

    LEGACY_BOOK_WIDGET_URIS.forEach((uri, i) => {
      server.registerResource(
        `book-widget-legacy-${i}`,
        uri,
        { title: "H5P book preview", mimeType: "text/html+skybridge", _meta: WIDGET_CSP },
        async () => ({
          contents: [
            { uri, mimeType: "text/html+skybridge", text: BOOK_WIDGET_HTML, _meta: WIDGET_CSP },
          ],
        }),
      );
    });

    LEGACY_VIDEO_WIDGET_URIS.forEach((uri, i) => {
      server.registerResource(
        `video-widget-legacy-${i}`,
        uri,
        { title: "H5P video preview", mimeType: "text/html+skybridge", _meta: VIDEO_WIDGET_CSP },
        async () => ({
          contents: [
            { uri, mimeType: "text/html+skybridge", text: VIDEO_WIDGET_HTML, _meta: VIDEO_WIDGET_CSP },
          ],
        }),
      );
    });

    // Metadata-only fields layered on top of the quiz content shape - kept out
    // of quizSpecSchema itself so they never affect the content-addressed
    // token (two calls with identical questions must still produce the same
    // token, regardless of what refinementNote says). See "Understanding
    // refinement patterns" in specs/feedback_loop_spec.md.
    const toolInputShape = {
      ...quizSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a quiz you generated earlier with this tool, pass back " +
            "that quiz's token (the id segment of its downloadUrl/playUrl/token field) so we " +
            "can tell what changed.",
        ),
      refinementNote: z
        .string()
        .max(300)
        .optional()
        .describe(
          "If this is a refinement, briefly say what changed and why (e.g. 'made question 2 " +
            "harder', 'added a question about photosynthesis'). Helps us understand what " +
            "educators actually need - not shown to the user, purely internal.",
        ),
    };

    server.registerTool(
      "create_h5p_quiz",
      {
        title: "Create an H5P quiz",
        description:
          "Turn learning content into an interactive H5P Question Set (multiple-choice quiz) " +
          "and return a downloadable .h5p file. You (the model) write the questions from the " +
          "user's content, then call this with the full question list. To refine, call again " +
          "with the updated list, passing `previousToken` (from the earlier result's `token` " +
          "field) and a short `refinementNote`. Each answer needs a `correct` flag; at least " +
          "one per question.\n\n" +
          "This renders as an inline card with its own working buttons (Take the quiz, " +
          "Download, Open in h5p.com, etc.) - your reply should NOT restate or re-link to " +
          "anything the card already has a button for (e.g. \"play it here\", \"click to " +
          "download\", \"open in h5p.com\"). Keep your reply to a short description of what " +
          "you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong " +
          "(dates, current events, statistics, named entities), verify them against a " +
          "reliable source before finalizing the questions, and briefly say what you checked " +
          "them against.\n\n" +
          "If it's genuinely unclear whether the user has specific source material (notes, a " +
          "document, a pasted article) they want the quiz based on, versus being fine with a " +
          "general-knowledge example on a topic, ask them briefly before generating. Don't ask " +
          "if their message already makes this clear either way (e.g. they already pasted " +
          "content, attached a file, or explicitly asked for a generic/example quiz).",
        inputSchema: toolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P quiz…",
          "openai/toolInvocation/invoked": "Your H5P quiz is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const rateLimit = await checkGenerationRateLimit(anonUid);
        if (!rateLimit.allowed) {
          try {
            await getDb().insert(events).values({ quizToken: "", eventType: "rate_limited", anonUid });
          } catch (err) {
            console.error("quiz: failed to log rate_limited event", err);
          }
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `You've built or refined ${rateLimit.count} H5P activities in the last ` +
                  `${rateLimit.windowMinutes} minutes, which is this early experiment's limit ` +
                  `(${rateLimit.limit}). Please wait a bit before generating more.`,
              },
            ],
            isError: true,
          };
        }

        const { previousToken, refinementNote, ...quizArgs } = args as Record<string, unknown>;
        const spec = quizSpecSchema.parse(quizArgs);
        // Build the file set here so bad input fails loudly inside the tool call.
        const built = await buildQuizFiles(spec);
        const token = encodeSpec({ kind: "quiz", spec });
        // The player route (hit the instant "Take the quiz" is clicked) reads
        // this same cache by token - prime it now with the package we just
        // built, instead of making that first click rebuild it cold.
        warmCache(token, built);
        const base = baseUrl();
        const downloadUrl = `${base}/api/h5p/${token}`;
        const playUrl = `${base}/play/${token}`;

        // Log on EVERY call, not just refinements - "how many users use the
        // plugin" needs a row per invocation to count distinct anonUid from.
        // Best-effort: never let this logging fail the actual tool call.
        try {
          if (typeof previousToken === "string" && previousToken) {
            const prev = decodeSpec(previousToken);
            const kinds = prev.kind === "quiz" ? classifyRefinement(prev.spec, spec) : ["other" as const];
            await getDb()
              .insert(events)
              .values({
                quizToken: token,
                eventType: "refinement",
                anonUid,
                detail: JSON.stringify({
                  previousToken,
                  kinds,
                  refinementNote: typeof refinementNote === "string" ? refinementNote : null,
                }),
              });
          } else {
            await getDb().insert(events).values({ quizToken: token, eventType: "generate", anonUid });
          }
        } catch (err) {
          console.error("create_h5p_quiz: failed to log usage", err);
        }

        // No playUrl/downloadUrl/playerUrl here - structuredContent is what
        // the model reads verbatim (confirmed against OpenAI's own Apps SDK
        // docs: "the model reads them verbatim"), and a ready-made "play
        // this quiz" URL was exactly what it kept spontaneously turning into
        // a "Play it here" line in its reply, regardless of any instruction.
        // The widget derives all three from token + appOrigin instead (see
        // quizPlayUrl()/quizDownloadUrl()/quizPlayerUrl() in widget.ts) -
        // appOrigin alone gives the model nothing readymade to link.
        const structured = {
          title: spec.title,
          questionCount: spec.questions.length,
          passPercentage: spec.passPercentage,
          token,
          appOrigin: base,
          filename: built.filename,
          anonUid,
          questions: spec.questions.map((q) => ({
            question: q.question,
            answers: q.answers.map((a) => ({ text: a.text, correct: a.correct })),
          })),
        };

        // MCP-UI resource: clients that support it (some Claude Desktop builds,
        // MCP-UI renderers) show the quiz inline in a panel. Others ignore it and
        // use the text + links below.
        const uiResource = {
          type: "resource" as const,
          resource: {
            uri: `ui://h5p-quiz/${token}`,
            mimeType: "text/html",
            text:
              `<!doctype html><html><head><meta charset="utf-8">` +
              `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}</style>` +
              `</head><body><iframe src="${playUrl}" allowfullscreen></iframe></body></html>`,
          },
        };

        // anonUid is only ever set from openai/subject (see deriveAnonUid) -
        // its presence means this call came through the Apps SDK, which
        // renders the widget card (Take the quiz / Download / Open in
        // h5p.com buttons already there). Spelling out the same links in
        // the text duplicates them as a "Play the quiz · Download the quiz"
        // line ChatGPT renders above the card. Clients without a card at
        // all (Claude Desktop, MCP Inspector - anonUid null) have no other
        // way to reach any of this, so they still need the links here.
        const summary =
          `Built "${spec.title}" - ${spec.questions.length} multiple-choice question(s), ` +
          `pass mark ${spec.passPercentage}%.`;
        // The h5p.com upsell lives in the widget card's footer (footerBar()
        // in widget.ts) and on the /play page, not here - the model wasn't
        // reliably including it in its reply even with a MANDATORY tool
        // instruction (tested, dropped), and repeating it in the text below
        // would duplicate what the card/play page already say.
        const text = anonUid
          ? summary
          : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}`;

        return {
          content: [
            { type: "text", text },
            uiResource,
          ],
          structuredContent: structured,
          _meta: { "openai/outputTemplate": WIDGET_URI },
        };
      },
    );

    const bookToolInputShape = {
      ...bookSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a book you generated earlier with this tool, pass back " +
            "that book's token (the id segment of its downloadUrl/playUrl/token field) so we " +
            "can tell what changed.",
        ),
      refinementNote: z
        .string()
        .max(300)
        .optional()
        .describe("If this is a refinement, briefly say what changed and why."),
    };

    server.registerTool(
      "create_h5p_book",
      {
        title: "Create an H5P interactive book",
        description:
          "Turn a book, article, or set of notes into an interactive H5P Interactive Book " +
          "(chapters of text with embedded checkpoint questions) and return a downloadable " +
          ".h5p file. You (the model) write the chapter headings and body paragraphs from the " +
          "user's content, and add an optional checkpoint question (multiple-choice or " +
          "true/false) to chapters where a check-in makes sense. If the user hasn't said how " +
          "often they want checkpoint questions, ask them first rather than guessing - reflect " +
          "their answer in `checkpointFrequency` and in which chapters actually carry a " +
          "`checkpoint`. Text only for now - no images. To refine, call again with the updated " +
          "chapters, passing `previousToken` and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the book, " +
          "Download, Open in h5p.com) - your reply should NOT restate or re-link to anything " +
          "the card already has a button for. Keep your reply to a short description of what " +
          "you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, " +
          "verify them against a reliable source before finalizing, and briefly say what you " +
          "checked them against.\n\n" +
          "If it's genuinely unclear whether the user has specific source material (notes, a " +
          "document, a pasted article) they want the book based on, versus being fine with a " +
          "general-knowledge example on a topic, ask them briefly before generating. Don't ask " +
          "if their message already makes this clear either way (e.g. they already pasted " +
          "content, attached a file, or explicitly asked for a generic/example book).",
        inputSchema: bookToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": BOOK_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P book…",
          "openai/toolInvocation/invoked": "Your H5P book is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const rateLimit = await checkGenerationRateLimit(anonUid);
        if (!rateLimit.allowed) {
          try {
            await getDb().insert(events).values({ quizToken: "", eventType: "rate_limited", anonUid });
          } catch (err) {
            console.error("book: failed to log rate_limited event", err);
          }
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `You've built or refined ${rateLimit.count} H5P activities in the last ` +
                  `${rateLimit.windowMinutes} minutes, which is this early experiment's limit ` +
                  `(${rateLimit.limit}). Please wait a bit before generating more.`,
              },
            ],
            isError: true,
          };
        }

        const { previousToken, refinementNote, ...bookArgs } = args as Record<string, unknown>;
        const spec = bookSpecSchema.parse(bookArgs);
        const built = await buildBookFiles(spec);
        const token = encodeSpec({ kind: "book", spec });
        warmCache(token, built);
        const base = baseUrl();
        const downloadUrl = `${base}/api/h5p/${token}`;
        const playUrl = `${base}/play/${token}`;

        try {
          if (typeof previousToken === "string" && previousToken) {
            await getDb()
              .insert(events)
              .values({
                quizToken: token,
                eventType: "refinement",
                anonUid,
                detail: JSON.stringify({
                  previousToken,
                  refinementNote: typeof refinementNote === "string" ? refinementNote : null,
                }),
              });
          } else {
            await getDb().insert(events).values({ quizToken: token, eventType: "generate", anonUid });
          }
        } catch (err) {
          console.error("create_h5p_book: failed to log usage", err);
        }

        const chapterCount = spec.chapters.length;
        const checkpointCount = spec.chapters.filter((c) => c.checkpoint).length;
        const structured = {
          title: spec.title,
          meta: `${chapterCount} chapter${chapterCount === 1 ? "" : "s"}`,
          chapterCount,
          checkpointCount,
          token,
          appOrigin: base,
          filename: built.filename,
          anonUid,
        };

        const uiResource = {
          type: "resource" as const,
          resource: {
            uri: `ui://h5p-book/${token}`,
            mimeType: "text/html",
            text:
              `<!doctype html><html><head><meta charset="utf-8">` +
              `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}</style>` +
              `</head><body><iframe src="${playUrl}" allowfullscreen></iframe></body></html>`,
          },
        };

        const summary =
          `Built "${spec.title}" - ${chapterCount} chapter${chapterCount === 1 ? "" : "s"}` +
          (checkpointCount ? `, ${checkpointCount} with a checkpoint question` : "") + `.`;
        const text = anonUid
          ? summary
          : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}`;

        return {
          content: [{ type: "text", text }, uiResource],
          structuredContent: structured,
          _meta: { "openai/outputTemplate": BOOK_WIDGET_URI },
        };
      },
    );

    const videoToolInputShape = {
      ...videoSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a video you generated earlier with this tool, pass back " +
            "that video's token so we can tell what changed.",
        ),
      refinementNote: z
        .string()
        .max(300)
        .optional()
        .describe("If this is a refinement, briefly say what changed and why."),
    };

    server.registerTool(
      "create_h5p_interactive_video",
      {
        title: "Create an H5P interactive video",
        description:
          "Turn a YouTube video into an H5P Interactive Video with timed text notes and/or " +
          "checkpoint questions, and return a downloadable .h5p file. Requires a real " +
          "youtube.com or youtu.be URL from the user - never invent one. You (the model) " +
          "build the `timeline` (text notes and/or multiple-choice/true-false questions at " +
          "specific timestamps) from what the video actually covers. If the user hasn't " +
          "said how many interactions they want, ask first rather than guessing, and " +
          "reflect their answer in `interactionDensity`. To refine, call again with the " +
          "updated timeline, passing `previousToken` and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Watch the video, " +
          "Download, Open in h5p.com) - your reply should NOT restate or re-link to anything " +
          "the card already has a button for. Keep your reply to a short description of what " +
          "you built.\n\n" +
          "Before asking the user what the video covers, check whether you have a way to " +
          "find out yourself (e.g. a code execution or browsing tool that can fetch the " +
          "video's transcript or metadata, such as yt-dlp) and use that first - it's faster " +
          "and more accurate than asking, and timestamps line up better against a real " +
          "transcript. Only ask the user directly if no such tool is available to you, or it " +
          "fails. Don't ask if they've already described the content themselves.",
        inputSchema: videoToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": VIDEO_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P interactive video…",
          "openai/toolInvocation/invoked": "Your H5P interactive video is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const rateLimit = await checkGenerationRateLimit(anonUid);
        if (!rateLimit.allowed) {
          try {
            await getDb().insert(events).values({ quizToken: "", eventType: "rate_limited", anonUid });
          } catch (err) {
            console.error("video: failed to log rate_limited event", err);
          }
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `You've built or refined ${rateLimit.count} H5P activities in the last ` +
                  `${rateLimit.windowMinutes} minutes, which is this early experiment's limit ` +
                  `(${rateLimit.limit}). Please wait a bit before generating more.`,
              },
            ],
            isError: true,
          };
        }

        const { previousToken, refinementNote, ...videoArgs } = args as Record<string, unknown>;
        const spec = videoSpecSchema.parse(videoArgs);
        const built = await buildVideoFiles(spec);
        const token = encodeSpec({ kind: "video", spec });
        warmCache(token, built);
        const base = baseUrl();
        const downloadUrl = `${base}/api/h5p/${token}`;
        const playUrl = `${base}/play/${token}`;

        try {
          if (typeof previousToken === "string" && previousToken) {
            await getDb()
              .insert(events)
              .values({
                quizToken: token,
                eventType: "refinement",
                anonUid,
                detail: JSON.stringify({
                  previousToken,
                  refinementNote: typeof refinementNote === "string" ? refinementNote : null,
                }),
              });
          } else {
            await getDb().insert(events).values({ quizToken: token, eventType: "generate", anonUid });
          }
        } catch (err) {
          console.error("create_h5p_interactive_video: failed to log usage", err);
        }

        const interactionCount = spec.timeline.length;
        const structured = {
          title: spec.title,
          meta: `${interactionCount} interaction${interactionCount === 1 ? "" : "s"}`,
          interactionCount,
          token,
          appOrigin: base,
          filename: built.filename,
          anonUid,
        };

        const uiResource = {
          type: "resource" as const,
          resource: {
            uri: `ui://h5p-video/${token}`,
            mimeType: "text/html",
            text:
              `<!doctype html><html><head><meta charset="utf-8">` +
              `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh;display:block}</style>` +
              `</head><body><iframe src="${playUrl}" allowfullscreen></iframe></body></html>`,
          },
        };

        const summary = `Built "${spec.title}" - ${interactionCount} interaction${interactionCount === 1 ? "" : "s"}.`;
        const text = anonUid
          ? summary
          : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}`;

        return {
          content: [{ type: "text", text }, uiResource],
          structuredContent: structured,
          _meta: { "openai/outputTemplate": VIDEO_WIDGET_URI },
        };
      },
    );

    const accordionToolInputShape = {
      ...accordionSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of an accordion you generated earlier with this tool, pass back that " +
            "accordion's token (the id segment of its downloadUrl/playUrl/token field) so we can tell what " +
            "changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_accordion",
      {
        title: "Create an H5P accordion",
        description:
          "Turn reference or FAQ-style content into an interactive H5P Accordion (a list of expandable " +
          "panels, each with a title and body text) and return a downloadable .h5p file. Good for content " +
          "that's naturally a set of independent topics the user browses rather than reads straight " +
          "through. You (the model) write each panel's title and body paragraphs from the user's content. " +
          "To refine, call again with the updated panels, passing `previousToken` and a short " +
          "`refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the accordion, Download, " +
          "Open in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: accordionToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": ACCORDION_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P accordion…",
          "openai/toolInvocation/invoked": "Your H5P accordion is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_accordion");
        if (limited) return limited;

        const { previousToken, refinementNote, ...accordionArgs } = args as Record<string, unknown>;
        const spec = accordionSpecSchema.parse(accordionArgs);
        return finishContentToolCall({
          kind: "accordion",
          spec,
          buildFiles: buildAccordionFiles,
          widgetUri: ACCORDION_WIDGET_URI,
          metaLine: `${spec.panels.length} panel${spec.panels.length === 1 ? "" : "s"}`,
          extraStructured: { panelCount: spec.panels.length },
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_accordion",
        });
      },
    );

    const dialogcardsToolInputShape = {
      ...dialogcardsSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a dialog cards deck you generated earlier with this tool, pass back " +
            "that deck's token (the id segment of its downloadUrl/playUrl/token field) so we can tell what " +
            "changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_dialogcards",
      {
        title: "Create H5P dialog cards",
        description:
          "Turn vocabulary, definitions, or quick-recall Q&A content into an interactive H5P Dialog Cards " +
          "deck (a stack of flippable front/back cards) and return a downloadable .h5p file. You (the " +
          "model) write each card's front (the prompt) and back (the answer) from the user's content. To " +
          "refine, call again with the updated cards, passing `previousToken` and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the dialog cards, Download, " +
          "Open in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: dialogcardsToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": DIALOGCARDS_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P dialog cards…",
          "openai/toolInvocation/invoked": "Your H5P dialog cards are ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_dialogcards");
        if (limited) return limited;

        const { previousToken, refinementNote, ...dialogcardsArgs } = args as Record<string, unknown>;
        const spec = dialogcardsSpecSchema.parse(dialogcardsArgs);
        return finishContentToolCall({
          kind: "dialogcards",
          spec,
          buildFiles: buildDialogcardsFiles,
          widgetUri: DIALOGCARDS_WIDGET_URI,
          metaLine: `${spec.cards.length} card${spec.cards.length === 1 ? "" : "s"}`,
          extraStructured: { cardCount: spec.cards.length },
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_dialogcards",
        });
      },
    );

    const blanksToolInputShape = {
      ...blanksSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a fill-in-the-blanks activity you generated earlier with this tool, " +
            "pass back that activity's token (the id segment of its downloadUrl/playUrl/token field) so we " +
            "can tell what changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_blanks",
      {
        title: "Create an H5P fill-in-the-blanks activity",
        description:
          "Turn content into an interactive H5P Fill in the Blanks activity and return a downloadable " +
          ".h5p file. You (the model) write each sentence, marking the word(s) to blank out by wrapping " +
          'them in asterisks, e.g. "The capital of France is *Paris*." Use a slash inside the asterisks to ' +
          'accept more than one correct answer for the same blank, e.g. "*color/colour*." A sentence can ' +
          "have multiple blanks. To refine, call again with the updated questions, passing `previousToken` " +
          "and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the activity, Download, Open " +
          "in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: blanksToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": BLANKS_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P fill-in-the-blanks activity…",
          "openai/toolInvocation/invoked": "Your H5P fill-in-the-blanks activity is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_blanks");
        if (limited) return limited;

        const { previousToken, refinementNote, ...blanksArgs } = args as Record<string, unknown>;
        const spec = blanksSpecSchema.parse(blanksArgs);
        return finishContentToolCall({
          kind: "blanks",
          spec,
          buildFiles: buildBlanksFiles,
          widgetUri: BLANKS_WIDGET_URI,
          metaLine: `${spec.questions.length} question${spec.questions.length === 1 ? "" : "s"}`,
          extraStructured: { questionCount: spec.questions.length },
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_blanks",
        });
      },
    );

    const dragtextToolInputShape = {
      ...dragtextSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a drag-the-words activity you generated earlier with this tool, " +
            "pass back that activity's token (the id segment of its downloadUrl/playUrl/token field) so " +
            "we can tell what changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_dragtext",
      {
        title: "Create an H5P drag-the-words activity",
        description:
          "Turn content into an interactive H5P Drag the Words activity (a passage where marked words are " +
          "pulled into a word bank and dragged back into place) and return a downloadable .h5p file. You " +
          '(the model) write the passage, wrapping each word or short phrase that should be draggable in ' +
          'asterisks, e.g. "The mitochondria is the *powerhouse* of the cell." Optionally add extra decoy ' +
          'words with the same syntax in `distractors`, e.g. "*nucleus* *ribosome*." To refine, call again ' +
          "with the updated passage, passing `previousToken` and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the activity, Download, Open " +
          "in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: dragtextToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": DRAGTEXT_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P drag-the-words activity…",
          "openai/toolInvocation/invoked": "Your H5P drag-the-words activity is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_dragtext");
        if (limited) return limited;

        const { previousToken, refinementNote, ...dragtextArgs } = args as Record<string, unknown>;
        const spec = dragtextSpecSchema.parse(dragtextArgs);
        return finishContentToolCall({
          kind: "dragtext",
          spec,
          buildFiles: buildDragTextFiles,
          widgetUri: DRAGTEXT_WIDGET_URI,
          metaLine: "drag the words",
          extraStructured: {},
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_dragtext",
        });
      },
    );

    const singleChoiceSetToolInputShape = {
      ...singlechoicesetSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a single choice set you generated earlier with this tool, pass back " +
            "that activity's token (the id segment of its downloadUrl/playUrl/token field) so we can tell " +
            "what changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_singlechoiceset",
      {
        title: "Create an H5P single choice set",
        description:
          "Turn content into an interactive H5P Single Choice Set (a sequence of single-answer questions " +
          "that auto-advance on a correct pick) and return a downloadable .h5p file. You (the model) write " +
          "each question's text and its answer options - the FIRST answer in the `answers` array must " +
          "always be the correct one; the rest are distractors (the runtime shuffles display order itself, " +
          "so order doesn't telegraph the answer to the learner). To refine, call again with the updated " +
          "questions, passing `previousToken` and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the activity, Download, Open " +
          "in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: singleChoiceSetToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": SINGLE_CHOICE_SET_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P single choice set…",
          "openai/toolInvocation/invoked": "Your H5P single choice set is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_singlechoiceset");
        if (limited) return limited;

        const { previousToken, refinementNote, ...scsArgs } = args as Record<string, unknown>;
        const spec = singlechoicesetSpecSchema.parse(scsArgs);
        return finishContentToolCall({
          kind: "singlechoiceset",
          spec,
          buildFiles: buildSingleChoiceSetFiles,
          widgetUri: SINGLE_CHOICE_SET_WIDGET_URI,
          metaLine: `${spec.choices.length} question${spec.choices.length === 1 ? "" : "s"}`,
          extraStructured: { questionCount: spec.choices.length },
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_singlechoiceset",
        });
      },
    );

    const crosswordToolInputShape = {
      ...crosswordSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a crossword you generated earlier with this tool, pass back that " +
            "crossword's token (the id segment of its downloadUrl/playUrl/token field) so we can tell what " +
            "changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_crossword",
      {
        title: "Create an H5P crossword",
        description:
          "Turn content into an interactive H5P Crossword and return a downloadable .h5p file. You (the " +
          "model) write clue/answer pairs - each answer must be a single word, letters only, no spaces or " +
          "punctuation. The grid layout itself is generated automatically in the learner's browser from " +
          "these pairs by overlapping shared letters, so favor a set of words that are thematically " +
          "related and likely to share some letters; a set of totally unrelated words may fail to produce " +
          "a complete grid. To refine, call again with the updated word list, passing `previousToken` and " +
          "a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the crossword, Download, Open " +
          "in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: crosswordToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": CROSSWORD_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P crossword…",
          "openai/toolInvocation/invoked": "Your H5P crossword is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_crossword");
        if (limited) return limited;

        const { previousToken, refinementNote, ...crosswordArgs } = args as Record<string, unknown>;
        const spec = crosswordSpecSchema.parse(crosswordArgs);
        return finishContentToolCall({
          kind: "crossword",
          spec,
          buildFiles: buildCrosswordFiles,
          widgetUri: CROSSWORD_WIDGET_URI,
          metaLine: `${spec.words.length} word${spec.words.length === 1 ? "" : "s"}`,
          extraStructured: { wordCount: spec.words.length },
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_crossword",
        });
      },
    );

    const dragquestionToolInputShape = {
      ...dragquestionSpecShape,
      previousToken: z
        .string()
        .optional()
        .describe(
          "If this is a refinement of a drag-and-drop activity you generated earlier with this tool, pass " +
            "back that activity's token (the id segment of its downloadUrl/playUrl/token field) so we can " +
            "tell what changed.",
        ),
      refinementNote: z.string().max(300).optional().describe("If this is a refinement, briefly say what changed and why."),
    };
    server.registerTool(
      "create_h5p_dragquestion",
      {
        title: "Create an H5P drag-and-drop activity",
        description:
          "Turn content into an interactive H5P Drag and Drop activity and return a downloadable .h5p " +
          "file. This tool builds a text-only 'match the term to its definition' board (no images) - you " +
          "(the model) write term/definition pairs, and the learner drags each term onto its matching " +
          "definition. Use this for matching-style content (terms, steps, categories); for other kinds of " +
          "drag interactions involving actual images, this tool isn't a fit. To refine, call again with " +
          "the updated pairs, passing `previousToken` and a short `refinementNote`.\n\n" +
          "This renders as an inline card with its own working buttons (Open the activity, Download, Open " +
          "in h5p.com) - your reply should NOT restate or re-link to anything the card already has a " +
          "button for. Keep your reply to a short description of what you built.\n\n" +
          "If the content touches facts that could be time-sensitive or easy to get wrong, verify them " +
          "against a reliable source before finalizing, and briefly say what you checked them against.",
        inputSchema: dragquestionToolInputShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": DRAGQUESTION_WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P drag-and-drop activity…",
          "openai/toolInvocation/invoked": "Your H5P drag-and-drop activity is ready",
        },
      },
      async (args, extra) => {
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);
        const limited = await checkRateLimitOrReject(anonUid, "create_h5p_dragquestion");
        if (limited) return limited;

        const { previousToken, refinementNote, ...dragquestionArgs } = args as Record<string, unknown>;
        const spec = dragquestionSpecSchema.parse(dragquestionArgs);
        return finishContentToolCall({
          kind: "dragquestion",
          spec,
          buildFiles: buildDragQuestionFiles,
          widgetUri: DRAGQUESTION_WIDGET_URI,
          metaLine: `${spec.pairs.length} pair${spec.pairs.length === 1 ? "" : "s"}`,
          extraStructured: { pairCount: spec.pairs.length },
          anonUid,
          previousToken: typeof previousToken === "string" ? previousToken : undefined,
          refinementNote: typeof refinementNote === "string" ? refinementNote : undefined,
          toolLabel: "create_h5p_dragquestion",
        });
      },
    );
  },
  { serverInfo: { name: "h5p-chatgpt-app", version: "0.1.0" } },
  { basePath: "/api", disableSse: true, verboseLogs: process.env.NODE_ENV !== "production" },
);

export { handler as GET, handler as POST, handler as DELETE };
