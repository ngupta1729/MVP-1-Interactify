import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { quizSpecShape, quizSpecSchema } from "@/lib/h5p/quizSpec";
import { encodeSpec } from "@/lib/h5p/pack";
import { buildQuizFiles } from "@/lib/h5p/buildQuiz";
import { QUIZ_WIDGET_HTML } from "@/lib/h5p/widget";
import { baseUrl } from "@/lib/baseUrl";

export const runtime = "nodejs";
export const maxDuration = 60;

const WIDGET_URI = "ui://widget/quiz.html";

const handler = createMcpHandler(
  (server) => {
    // The component ChatGPT renders inline after the tool runs.
    server.registerResource(
      "quiz-widget",
      WIDGET_URI,
      { title: "H5P quiz preview", mimeType: "text/html+skybridge" },
      async () => ({
        contents: [
          { uri: WIDGET_URI, mimeType: "text/html+skybridge", text: QUIZ_WIDGET_HTML },
        ],
      }),
    );

    server.registerTool(
      "create_h5p_quiz",
      {
        title: "Create an H5P quiz",
        description:
          "Turn learning content into an interactive H5P Question Set (multiple-choice quiz) " +
          "and return a downloadable .h5p file. You (the model) write the questions from the " +
          "user's content, then call this with the full question list. To refine, call again " +
          "with the updated list. Each answer needs a `correct` flag; at least one per question.",
        inputSchema: quizSpecShape as unknown as z.ZodRawShape,
        _meta: {
          "openai/outputTemplate": WIDGET_URI,
          "openai/toolInvocation/invoking": "Building your H5P quiz…",
          "openai/toolInvocation/invoked": "Your H5P quiz is ready",
        },
      },
      async (args) => {
        const spec = quizSpecSchema.parse(args);
        // Build the file set here so bad input fails loudly inside the tool call.
        const built = await buildQuizFiles(spec);
        const downloadUrl = `${baseUrl()}/api/h5p/${encodeSpec(spec)}`;

        const structured = {
          title: spec.title,
          questionCount: spec.questions.length,
          passPercentage: spec.passPercentage,
          downloadUrl,
          filename: built.filename,
          questions: spec.questions.map((q) => ({
            question: q.question,
            answers: q.answers.map((a) => ({ text: a.text, correct: a.correct })),
          })),
        };

        return {
          content: [
            {
              type: "text",
              text:
                `Built "${spec.title}" - ${spec.questions.length} multiple-choice question(s), ` +
                `pass mark ${spec.passPercentage}%. Download: ${downloadUrl}`,
            },
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
