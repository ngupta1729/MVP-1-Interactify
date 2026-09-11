import type { Metadata } from "next";
import { decodeSpec } from "@/lib/h5p/pack";
import H5pPlayer from "@/components/H5pPlayer";

export const runtime = "nodejs";

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  try {
    const spec = decodeSpec((await params).token);
    return { title: `${spec.title} — H5P quiz` };
  } catch {
    return { title: "H5P quiz" };
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
  let questionCount = 0;
  let passPercentage = 60;
  try {
    const spec = decodeSpec(token);
    title = spec.title;
    questionCount = spec.questions.length;
    passPercentage = spec.passPercentage;
  } catch {
    return (
      <div className="wrap">
        <h1>Quiz link not valid</h1>
        <p className="muted">This link is malformed or truncated. Generate the quiz again.</p>
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
        <span className="muted">· {questionCount} questions · pass {passPercentage}%</span>
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
