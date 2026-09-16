import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { quizSpecShape, quizSpecSchema } from "@/lib/h5p/quizSpec";
import { bookSpecShape, bookSpecSchema } from "@/lib/h5p/bookSpec";
import { videoSpecShape, videoSpecSchema } from "@/lib/h5p/videoSpec";
import { encodeSpec, decodeSpec, warmCache } from "@/lib/h5p/pack";
import { buildQuizFiles } from "@/lib/h5p/buildQuiz";
import { buildBookFiles } from "@/lib/h5p/buildBook";
import { buildVideoFiles } from "@/lib/h5p/buildVideo";
import { classifyRefinement } from "@/lib/h5p/diffQuiz";
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

export const runtime = "nodejs";
export const maxDuration = 60;

// Bump the version segment whenever the widget HTML changes — ChatGPT caches
// component templates by URI, so a new URI forces a re-fetch.
const WIDGET_URI = "ui://widget/quiz-v23.html";
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
];
// Bump the version segment whenever BOOK_WIDGET_HTML/VIDEO_WIDGET_HTML change —
// same reasoning as the quiz widget's WIDGET_URI above. ChatGPT caches component
// templates by URI, not by content, so an unchanged URI serves stale HTML even
// after this server has been redeployed with new widget code.
const BOOK_WIDGET_URI = "ui://widget/book-v2.html";
const VIDEO_WIDGET_URI = "ui://widget/video-v2.html";
const LEGACY_BOOK_WIDGET_URIS = ["ui://widget/book-v1.html"];
const LEGACY_VIDEO_WIDGET_URIS = ["ui://widget/video-v1.html"];
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
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);

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
        // Tracked h5p.com hook. Tried living in the reply text for every
        // client, but the model wasn't reliably including it even with a
        // MANDATORY tool-description instruction (tested, still dropped) -
        // so for the card-having case (anonUid set) it's a button in the
        // widget instead (see footerBar() in widget.ts), which is
        // guaranteed regardless of what the model says. Clients without a
        // card at all (Claude Desktop, MCP Inspector - anonUid null) still
        // need it in the text, since they have no button to click.
        const h5pcomUrl = `${base}/api/track?token=${token}&target=h5pcom${anonUid ? `&uid=${anonUid}` : ""}`;
        const text = anonUid
          ? summary
          : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}\n` +
            `Want folders, collaboration, or usage analytics for it? Open in h5p.com: ${h5pcomUrl}`;

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
        const { previousToken, refinementNote, ...bookArgs } = args as Record<string, unknown>;
        const spec = bookSpecSchema.parse(bookArgs);
        const built = await buildBookFiles(spec);
        const token = encodeSpec({ kind: "book", spec });
        warmCache(token, built);
        const base = baseUrl();
        const downloadUrl = `${base}/api/h5p/${token}`;
        const playUrl = `${base}/play/${token}`;
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);

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
        const h5pcomUrl = `${base}/api/track?token=${token}&target=h5pcom${anonUid ? `&uid=${anonUid}` : ""}`;
        const text = anonUid
          ? summary
          : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}\n` +
            `Want folders, collaboration, or usage analytics for it? Open in h5p.com: ${h5pcomUrl}`;

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
        const { previousToken, refinementNote, ...videoArgs } = args as Record<string, unknown>;
        const spec = videoSpecSchema.parse(videoArgs);
        const built = await buildVideoFiles(spec);
        const token = encodeSpec({ kind: "video", spec });
        warmCache(token, built);
        const base = baseUrl();
        const downloadUrl = `${base}/api/h5p/${token}`;
        const playUrl = `${base}/play/${token}`;
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);

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
        const h5pcomUrl = `${base}/api/track?token=${token}&target=h5pcom${anonUid ? `&uid=${anonUid}` : ""}`;
        const text = anonUid
          ? summary
          : `${summary}\nPlay in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}\n` +
            `Want folders, collaboration, or usage analytics for it? Open in h5p.com: ${h5pcomUrl}`;

        return {
          content: [{ type: "text", text }, uiResource],
          structuredContent: structured,
          _meta: { "openai/outputTemplate": VIDEO_WIDGET_URI },
        };
      },
    );
  },
  { serverInfo: { name: "h5p-chatgpt-app", version: "0.1.0" } },
  { basePath: "/api", disableSse: true, verboseLogs: process.env.NODE_ENV !== "production" },
);

export { handler as GET, handler as POST, handler as DELETE };
