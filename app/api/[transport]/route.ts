import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { quizSpecShape, quizSpecSchema } from "@/lib/h5p/quizSpec";
import { encodeSpec, decodeSpec } from "@/lib/h5p/pack";
import { buildQuizFiles } from "@/lib/h5p/buildQuiz";
import { classifyRefinement } from "@/lib/h5p/diffQuiz";
import { QUIZ_WIDGET_HTML } from "@/lib/h5p/widget";
import { baseUrl } from "@/lib/baseUrl";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { deriveAnonUid } from "@/lib/db/anon";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bump the version segment whenever the widget HTML changes — ChatGPT caches
// component templates by URI, so a new URI forces a re-fetch.
const WIDGET_URI = "ui://widget/quiz-v10.html";
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
];
const APP_ORIGIN = new URL(baseUrl()).origin;

// Lets the ChatGPT widget load the h5p-standalone runtime + package files from our
// origin even when "Enforce CSP in developer mode" is on. resource_domains covers
// script-src (h5p-standalone bundles + library JS/CSS); connect_domains covers the
// content.json fetch. We render H5P with embedType "div" so no nested iframe is
// needed — frame_domains stays empty. Declared in both the legacy snake_case key
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
          "one per question.",
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
        const token = encodeSpec(spec);
        const base = baseUrl();
        const downloadUrl = `${base}/api/h5p/${token}`;
        const playUrl = `${base}/play/${token}`;
        const anonUid = deriveAnonUid(extra?._meta as Record<string, unknown> | undefined);

        // Best-effort: never let refinement logging fail the actual tool call.
        if (typeof previousToken === "string" && previousToken) {
          try {
            const prevSpec = decodeSpec(previousToken);
            const kinds = classifyRefinement(prevSpec, spec);
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
          } catch (err) {
            console.error("create_h5p_quiz: failed to log refinement", err);
          }
        }

        const structured = {
          title: spec.title,
          questionCount: spec.questions.length,
          passPercentage: spec.passPercentage,
          token,
          downloadUrl,
          playUrl,
          playerUrl: `${base}/api/h5p/${token}/player`,
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

        return {
          content: [
            {
              type: "text",
              text:
                `Built "${spec.title}" - ${spec.questions.length} multiple-choice question(s), ` +
                `pass mark ${spec.passPercentage}%.\n` +
                `Play in a browser: ${playUrl}\nDownload .h5p: ${downloadUrl}`,
            },
            uiResource,
          ],
          structuredContent: structured,
          _meta: { "openai/outputTemplate": WIDGET_URI },
        };
      },
    );
  },
  { serverInfo: { name: "h5p-chatgpt-app", version: "0.1.0" } },
  { basePath: "/api", disableSse: true, verboseLogs: process.env.NODE_ENV !== "production" },
);

export { handler as GET, handler as POST, handler as DELETE };
