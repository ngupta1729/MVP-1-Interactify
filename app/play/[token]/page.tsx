import type { Metadata } from "next";
import { decodeSpec } from "@/lib/h5p/pack";
import H5pPlayer from "@/components/H5pPlayer";

export const runtime = "nodejs";

const KIND_LABEL: Record<string, string> = {
  quiz: "H5P quiz",
  book: "H5P interactive book",
  video: "H5P interactive video",
};

function metaLine(cs: ReturnType<typeof decodeSpec>): string {
  if (cs.kind === "quiz") {
    return `${cs.spec.questions.length} questions · pass ${cs.spec.passPercentage}%`;
  }
  if (cs.kind === "book") {
    return `${cs.spec.chapters.length} chapter${cs.spec.chapters.length === 1 ? "" : "s"}`;
  }
  return `${cs.spec.timeline.length} interaction${cs.spec.timeline.length === 1 ? "" : "s"}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  try {
    const cs = decodeSpec((await params).token);
    return { title: `${cs.spec.title} — ${KIND_LABEL[cs.kind]}` };
  } catch {
    return { title: "H5P activity" };
  }
}

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { token } = await params;
  const embed = "embed" in (await searchParams);

  let title: string | null = null;
  let meta = "";
  try {
    const cs = decodeSpec(token);
    title = cs.spec.title;
    meta = metaLine(cs);
  } catch {
    return (
      <div className="wrap">
        <h1>Link not valid</h1>
        <p className="muted">This link is malformed or truncated. Generate the activity again.</p>
      </div>
    );
  }

  // Compact view for embedding inside another app (e.g. the ChatGPT widget iframe).
  if (embed) {
    return (
      <div style={{ padding: 8 }}>
        <H5pPlayer playerPath={`/api/h5p/${token}/player`} />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 12 }}>
        <strong>{title}</strong>{" "}
        <span className="muted">· {meta}</span>
      </div>
      <div className="panel" style={{ padding: 12 }}>
        <H5pPlayer playerPath={`/api/h5p/${token}/player`} />
      </div>
      <div className="row">
        <a className="dl" href={`/api/h5p/${token}`}>Download .h5p</a>
        <span className="muted">
          Import into{" "}
          <a href={`/api/track?token=${token}&target=h5pcom`} target="_blank" rel="noopener">h5p.com</a>{" "}
          or{" "}
          <a href={`/api/track?token=${token}&target=lumi`} target="_blank" rel="noopener">Lumi</a>.
        </span>
      </div>
    </div>
  );
}
