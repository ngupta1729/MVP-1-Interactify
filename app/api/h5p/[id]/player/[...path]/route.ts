import { getBuilt } from "@/lib/h5p/pack";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  json: "application/json",
  js: "text/javascript",
  css: "text/css",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

/**
 * GET /api/h5p/{id}/player/<path inside the package>
 * Serves the unpacked .h5p so the h5p-standalone player can render it in place.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; path: string[] }> }) {
  const { id, path } = await ctx.params;
  let pkg;
  try {
    pkg = await getBuilt(id);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const rel = path.join("/");
  const data = pkg.files.get(rel);
  if (!data) return new Response(`Not found: ${rel}`, { status: 404 });

  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": String(data.length),
      // The id *is* the content (gzipped spec), so every file under it is immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
