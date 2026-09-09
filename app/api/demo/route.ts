import { z } from "zod";
import { generateQuizSpec } from "@/lib/demoGenerate";
import { quizSpecSchema } from "@/lib/h5p/quizSpec";
import { encodeSpec } from "@/lib/h5p/pack";
import { buildQuizFiles } from "@/lib/h5p/buildQuiz";
import { baseUrl } from "@/lib/baseUrl";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  content: z.string().min(1).max(20000).optional(),
  instruction: z.string().max(500).optional(),
  previousSpec: quizSpecSchema.optional(),
  // Escape hatch: hand a finished quiz straight to the builder, skipping the
  // model call. Used for testing and when no OPENAI_API_KEY is configured.
  spec: quizSpecSchema.optional(),
}).refine((b) => b.content || b.spec, { message: "Provide `content` or `spec`." });

/**
 * DEMO harness. Simulates what ChatGPT would do (content -> questions) and then
 * runs the exact same build path as the MCP tool.
 */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  try {
    const spec = parsed.spec
      ? parsed.spec
      : await generateQuizSpec({
          content: parsed.content!,
          instruction: parsed.instruction,
          previousSpec: parsed.previousSpec,
        });
    const built = await buildQuizFiles(spec);
    const token = encodeSpec(spec);
    return Response.json({
      id: token,
      spec,
      filename: built.filename,
      downloadUrl: `${baseUrl()}/api/h5p/${token}`,
      playerPath: `/api/h5p/${token}/player`,
      playUrl: `${baseUrl()}/play/${token}`,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
