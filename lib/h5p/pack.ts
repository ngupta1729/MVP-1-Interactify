import { gzipSync, gunzipSync } from "node:zlib";
import { quizSpecSchema, type QuizSpec } from "./quizSpec";
import { bookSpecSchema, type BookSpec } from "./bookSpec";
import { videoSpecSchema, type VideoSpec } from "./videoSpec";
import { accordionSpecSchema, type AccordionSpec } from "./accordionSpec";
import { dialogcardsSpecSchema, type DialogcardsSpec } from "./dialogcardsSpec";
import { blanksSpecSchema, type BlanksSpec } from "./blanksSpec";
import { dragtextSpecSchema, type DragtextSpec } from "./dragtextSpec";
import { singlechoicesetSpecSchema, type SinglechoicesetSpec } from "./singlechoicesetSpec";
import { crosswordSpecSchema, type CrosswordSpec } from "./crosswordSpec";
import { dragquestionSpecSchema, type DragquestionSpec } from "./dragquestionSpec";
import { buildQuizFiles, packFiles } from "./buildQuiz";
import { buildBookFiles } from "./buildBook";
import { buildVideoFiles } from "./buildVideo";
import { buildAccordionFiles } from "./buildAccordion";
import { buildDialogcardsFiles } from "./buildDialogcards";
import { buildBlanksFiles } from "./buildBlanks";
import { buildDragTextFiles } from "./buildDragText";
import { buildSingleChoiceSetFiles } from "./buildSingleChoiceSet";
import { buildCrosswordFiles } from "./buildCrossword";
import { buildDragQuestionFiles } from "./buildDragQuestion";

/**
 * A built package is identified by an opaque token that *is* its content:
 * gzipped JSON of a {kind, spec} pair, base64url-encoded. This keeps the
 * whole app stateless - no database, no blob store - which matters on Vercel
 * where each request may hit a fresh instance. Tokens are ~1 KB; fine for
 * URLs, never user-typed.
 *
 * Tokens minted before content types beyond "quiz" existed are a bare
 * QuizSpec object with no `kind` field - decodeSpec() detects and handles
 * that shape so links already sitting in real chats keep working.
 */

export type ContentSpec =
  | { kind: "quiz"; spec: QuizSpec }
  | { kind: "book"; spec: BookSpec }
  | { kind: "video"; spec: VideoSpec }
  | { kind: "accordion"; spec: AccordionSpec }
  | { kind: "dialogcards"; spec: DialogcardsSpec }
  | { kind: "blanks"; spec: BlanksSpec }
  | { kind: "dragtext"; spec: DragtextSpec }
  | { kind: "singlechoiceset"; spec: SinglechoicesetSpec }
  | { kind: "crossword"; spec: CrosswordSpec }
  | { kind: "dragquestion"; spec: DragquestionSpec };

export function encodeSpec(cs: ContentSpec): string {
  const validated: ContentSpec = { ...cs, spec: specSchemaFor(cs.kind).parse(cs.spec) } as ContentSpec;
  return gzipSync(Buffer.from(JSON.stringify(validated), "utf8")).toString("base64url");
}

function specSchemaFor(kind: ContentSpec["kind"]) {
  switch (kind) {
    case "quiz":
      return quizSpecSchema;
    case "book":
      return bookSpecSchema;
    case "video":
      return videoSpecSchema;
    case "accordion":
      return accordionSpecSchema;
    case "dialogcards":
      return dialogcardsSpecSchema;
    case "blanks":
      return blanksSpecSchema;
    case "dragtext":
      return dragtextSpecSchema;
    case "singlechoiceset":
      return singlechoicesetSpecSchema;
    case "crossword":
      return crosswordSpecSchema;
    case "dragquestion":
      return dragquestionSpecSchema;
  }
}

export function decodeSpec(token: string): ContentSpec {
  const raw = JSON.parse(gunzipSync(Buffer.from(token, "base64url")).toString("utf8"));

  // Back-compat: tokens minted before this change are a bare QuizSpec, no `kind`.
  if (raw && typeof raw === "object" && !("kind" in raw) && "questions" in raw) {
    return { kind: "quiz", spec: quizSpecSchema.parse(raw) };
  }

  const kind = raw?.kind;
  if (
    kind !== "quiz" &&
    kind !== "book" &&
    kind !== "video" &&
    kind !== "accordion" &&
    kind !== "dialogcards" &&
    kind !== "blanks" &&
    kind !== "dragtext" &&
    kind !== "singlechoiceset" &&
    kind !== "crossword" &&
    kind !== "dragquestion"
  ) {
    throw new Error("Unrecognized content token.");
  }
  return { kind, spec: specSchemaFor(kind).parse(raw.spec) } as ContentSpec;
}

function buildFilesFor(cs: ContentSpec) {
  switch (cs.kind) {
    case "quiz":
      return buildQuizFiles(cs.spec);
    case "book":
      return buildBookFiles(cs.spec);
    case "video":
      return buildVideoFiles(cs.spec);
    case "accordion":
      return buildAccordionFiles(cs.spec);
    case "dialogcards":
      return buildDialogcardsFiles(cs.spec);
    case "blanks":
      return buildBlanksFiles(cs.spec);
    case "dragtext":
      return buildDragTextFiles(cs.spec);
    case "singlechoiceset":
      return buildSingleChoiceSetFiles(cs.spec);
    case "crossword":
      return buildCrosswordFiles(cs.spec);
    case "dragquestion":
      return buildDragQuestionFiles(cs.spec);
  }
}

export interface BuiltPackage {
  filename: string;
  files: Map<string, Buffer>; // unpacked, for the embedded player
}

// Per-instance cache of unpacked packages, keyed by token.
const cache = new Map<string, BuiltPackage>();
const MAX_CACHE = 24;

function setCache(token: string, pkg: BuiltPackage): void {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(token, pkg);
}

export async function getBuilt(token: string): Promise<BuiltPackage> {
  const hit = cache.get(token);
  if (hit) return hit;

  const cs = decodeSpec(token);
  const pkg = await buildFilesFor(cs);
  setCache(token, pkg);
  return pkg;
}

/**
 * Pre-populate the cache with a package the caller already built, so the
 * player route (hit the instant "Take the quiz" is clicked) doesn't have to
 * rebuild it cold on a fresh Lambda instance. Called from the tool handler,
 * which builds this same package anyway to validate the spec - this reuses
 * that work instead of discarding it. Doesn't guarantee a warm hit (a
 * concurrent request can still land on a different instance), but removes
 * the single guaranteed-cold case: the very first click on a brand-new token.
 */
export function warmCache(token: string, pkg: BuiltPackage): void {
  setCache(token, pkg);
}

/** The downloadable .h5p for a token. */
export async function getH5pBuffer(token: string): Promise<{ filename: string; buffer: Buffer }> {
  const { filename, files } = await getBuilt(token);
  return { filename, buffer: await packFiles(files) };
}
