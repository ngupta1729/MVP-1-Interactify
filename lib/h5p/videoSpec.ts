import { z } from "zod";
import { checkpointQuestionSchema, validateCheckpoint } from "./checkpointSpec";

/**
 * The video structure this app works with. ChatGPT supplies a real YouTube
 * URL (it cannot fabricate one) plus a timeline of text notes / checkpoint
 * questions at specific timestamps, and calls the tool with it - the server
 * never runs an LLM.
 *
 * YouTube-sourced only for v1: no video upload/hosting infra.
 */

// Mirrors H5P.Video's own getId() regex, so a bad URL fails loudly here
// instead of shipping a .h5p whose video silently won't load.
const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

export const textTimelineItemSchema = z.object({
  kind: z.literal("text"),
  timestampSeconds: z.number().int().min(0).describe("When this note appears, in seconds from the start"),
  title: z.string().max(80).optional(),
  body: z.string().min(1).max(600),
});

export const questionTimelineItemSchema = z.object({
  kind: z.literal("question"),
  timestampSeconds: z.number().int().min(0).describe("When this question appears, in seconds from the start"),
  question: checkpointQuestionSchema,
  pauseVideo: z.boolean().default(true).describe("Whether the video pauses while the question is shown"),
});

export const timelineItemSchema = z.discriminatedUnion("kind", [
  textTimelineItemSchema,
  questionTimelineItemSchema,
]);

export const videoSpecSchema = z.object({
  title: z.string().min(1).max(120).describe("Video title"),
  youtubeUrl: z
    .string()
    .url()
    .refine((u) => YOUTUBE_ID_RE.test(u), "Must be a youtube.com or youtu.be video URL"),
  introText: z.string().max(400).optional(),
  interactionDensity: z
    .enum(["light", "standard", "dense"])
    .optional()
    .default("standard")
    .describe("Roughly how many interactions to place. Ask the user if unclear."),
  timeline: z
    .array(timelineItemSchema)
    .min(1)
    .max(20)
    .describe("Text notes and/or checkpoint questions, placed at specific timestamps"),
});

export type TextTimelineItem = z.infer<typeof textTimelineItemSchema>;
export type QuestionTimelineItem = z.infer<typeof questionTimelineItemSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;

/** Raw shape for MCP tool registration (registerTool wants a ZodRawShape). */
export const videoSpecShape = videoSpecSchema.shape;

/** Normalise + sanity-check a video spec. Throws a readable error if unusable. */
export function validateVideo(spec: VideoSpec): VideoSpec {
  const parsed = videoSpecSchema.parse(spec);
  if (!YOUTUBE_ID_RE.test(parsed.youtubeUrl)) {
    throw new Error("Could not extract a YouTube video ID from youtubeUrl.");
  }
  parsed.timeline.forEach((item) => {
    if (item.kind === "question") validateCheckpoint(item.question);
  });
  return parsed;
}
