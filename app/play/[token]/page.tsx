import type { Metadata } from "next";
import { decodeSpec } from "@/lib/h5p/pack";

export const runtime = "nodejs";

const KIND_LABEL: Record<string, string> = {
  quiz: "H5P quiz",
  book: "H5P interactive book",
  video: "H5P interactive video",
  accordion: "H5P accordion",
  dialogcards: "H5P dialog cards",
  blanks: "H5P fill in the blanks",
  dragtext: "H5P drag the words",
  singlechoiceset: "H5P single choice set",
  crossword: "H5P crossword",
  dragquestion: "H5P drag and drop",
};

function metaLine(cs: ReturnType<typeof decodeSpec>): string {
  switch (cs.kind) {
    case "quiz":
      return `${cs.spec.questions.length} questions · pass ${cs.spec.passPercentage}%`;
    case "book":
      return `${cs.spec.chapters.length} chapter${cs.spec.chapters.length === 1 ? "" : "s"}`;
    case "video":
      return `${cs.spec.timeline.length} interaction${cs.spec.timeline.length === 1 ? "" : "s"}`;
    case "accordion":
      return `${cs.spec.panels.length} panel${cs.spec.panels.length === 1 ? "" : "s"}`;
    case "dialogcards":
      return `${cs.spec.cards.length} card${cs.spec.cards.length === 1 ? "" : "s"}`;
    case "blanks":
      return `${cs.spec.questions.length} question${cs.spec.questions.length === 1 ? "" : "s"}`;
    case "dragtext":
      return "drag the words";
    case "singlechoiceset":
      return `${cs.spec.choices.length} question${cs.spec.choices.length === 1 ? "" : "s"}`;
    case "crossword":
      return `${cs.spec.words.length} word${cs.spec.words.length === 1 ? "" : "s"}`;
    case "dragquestion":
      return `${cs.spec.pairs.length} pair${cs.spec.pairs.length === 1 ? "" : "s"}`;
  }
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

/**
 * Download/info page for a generated activity. Deliberately does NOT mount
 * an H5P player here: h5p-standalone injects every library's CSS/JS into
 * document.head of whatever page calls it (confirmed by reading its source),
 * which shared a cascade with this site's own app/globals.css and visibly
 * corrupted H5P's real styling (e.g. its own site-wide `button` rule). The
 * one place real H5P actually needs to render - the ChatGPT widget card -
 * runs in its own isolated document and is unaffected by this.
 */
export default async function PlayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

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

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div className="panel" style={{ padding: 18 }}>
        <div style={{ marginBottom: 12 }}>
          <strong>{title}</strong>{" "}
          <span className="muted">· {meta}</span>
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
    </div>
  );
}
