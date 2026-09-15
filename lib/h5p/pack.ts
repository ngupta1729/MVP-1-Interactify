import { gzipSync, gunzipSync } from "node:zlib";
import { quizSpecSchema, type QuizSpec } from "./quizSpec";
import { buildQuizFiles, packFiles } from "./buildQuiz";

/**
 * A built quiz is identified by an opaque token that *is* its content: gzipped
 * JSON of the QuizSpec, base64url-encoded. This keeps the whole app stateless -
 * no database, no blob store - which matters on Vercel where each request may
 * hit a fresh instance. Tokens are ~1 KB; fine for URLs, never user-typed.
 */

export function encodeSpec(spec: QuizSpec): string {
  const json = JSON.stringify(quizSpecSchema.parse(spec));
  return gzipSync(Buffer.from(json, "utf8")).toString("base64url");
}

export function decodeSpec(token: string): QuizSpec {
  const json = gunzipSync(Buffer.from(token, "base64url")).toString("utf8");
  return quizSpecSchema.parse(JSON.parse(json));
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

  const spec = decodeSpec(token);
  const pkg = await buildQuizFiles(spec);
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
