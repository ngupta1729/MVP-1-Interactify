import { quizSpecSchema, type QuizSpec } from "./h5p/quizSpec";

/**
 * DEMO-ONLY. In the real ChatGPT App, ChatGPT does this step and calls the MCP
 * tool directly. Here we call OpenAI ourselves so the end-to-end flow can be
 * shown without a paid ChatGPT developer-mode account.
 */

const QUIZ_JSON_SCHEMA = {
  name: "quiz",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "introduction", "passPercentage", "questions"],
    properties: {
      title: { type: "string" },
      introduction: { type: "string" },
      passPercentage: { type: "integer", minimum: 0, maximum: 100 },
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["question", "answers"],
          properties: {
            question: { type: "string" },
            answers: {
              type: "array",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["text", "correct", "feedback"],
                properties: {
                  text: { type: "string" },
                  correct: { type: "boolean" },
                  feedback: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const SYSTEM = `You convert learning content into a short multiple-choice quiz.
Rules:
- 3-6 questions unless the content clearly warrants fewer or more.
- Each question: 3-4 plausible options, 1 correct (occasionally 2 if natural).
- Base every question strictly on the provided content. No trick questions.
- "feedback" is a brief note shown after answering ("" if none).
- "introduction" is one short sentence. "passPercentage" is typically 60.`;

interface GenerateArgs {
  content: string;
  instruction?: string;
  previousSpec?: QuizSpec;
  model?: string;
}

export async function generateQuizSpec({
  content,
  instruction,
  previousSpec,
  model = process.env.OPENAI_MODEL || "gpt-4o-mini",
}: GenerateArgs): Promise<QuizSpec> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (needed only for the demo harness).");

  const userParts: string[] = [];
  if (previousSpec && instruction) {
    userParts.push(
      `Here is the current quiz as JSON:\n${JSON.stringify(previousSpec)}\n\n` +
        `Revise it based on this instruction, keeping everything else the same:\n"${instruction}"`,
    );
    if (content) userParts.push(`Source content for reference:\n${content}`);
  } else {
    userParts.push(`Create a quiz from this content:\n\n${content}`);
    if (instruction) userParts.push(`Extra guidance: ${instruction}`);
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userParts.join("\n\n") },
      ],
      response_format: { type: "json_schema", json_schema: QUIZ_JSON_SCHEMA },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned no content.");

  return quizSpecSchema.parse(JSON.parse(raw));
}
