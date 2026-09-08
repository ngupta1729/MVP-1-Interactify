import { getH5pBuffer } from "@/lib/h5p/pack";

export const runtime = "nodejs";

/** GET /api/h5p/{token} -> download the built .h5p package. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let pkg;
  try {
    pkg = await getH5pBuffer(id);
  } catch {
    return new Response("Invalid or expired quiz link.", { status: 404 });
  }

  return new Response(new Uint8Array(pkg.buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${pkg.filename}"`,
      "Content-Length": String(pkg.buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
