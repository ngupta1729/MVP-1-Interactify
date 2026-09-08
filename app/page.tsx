"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface QuizAnswer { text: string; correct: boolean; feedback?: string }
interface QuizQuestion { question: string; answers: QuizAnswer[] }
interface QuizSpec {
  title: string;
  introduction?: string;
  passPercentage: number;
  questions: QuizQuestion[];
}
interface DemoResult {
  id: string;
  spec: QuizSpec;
  filename: string;
  downloadUrl: string;
  playerPath: string;
}

declare global {
  interface Window {
    H5PStandalone?: { H5P: new (el: HTMLElement, opts: Record<string, unknown>) => Promise<unknown> };
  }
}

const SAMPLE = `The water cycle describes how water moves continuously on Earth.
Evaporation turns liquid water into vapour using energy from the sun, mostly from
oceans. Water vapour rises and cools, and condensation forms clouds. When droplets
grow heavy enough they fall as precipitation - rain, snow, sleet or hail. Water
that lands on soil either soaks in (infiltration) or flows over the surface as
runoff, eventually returning to rivers and oceans. Plants also release water
vapour through transpiration.`;

export default function Home() {
  const [content, setContent] = useState(SAMPLE);
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState<"" | "generate" | "refine">("");
  const [error, setError] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  // Load the H5P player runtime once.
  useEffect(() => {
    if (window.H5PStandalone) { setPlayerReady(true); return; }
    const s = document.createElement("script");
    s.src = "/h5p-standalone/main.bundle.js";
    s.onload = () => setPlayerReady(true);
    s.onerror = () => setError("Could not load the H5P player runtime.");
    document.body.appendChild(s);
  }, []);

  // (Re)render the embedded activity whenever we have a new result.
  useEffect(() => {
    if (!result || !playerReady || !hostRef.current || !window.H5PStandalone) return;
    const host = hostRef.current;
    host.innerHTML = "";
    const mount = document.createElement("div");
    host.appendChild(mount);
    new window.H5PStandalone.H5P(mount, {
      h5pJsonPath: result.playerPath,
      frameJs: "/h5p-standalone/frame.bundle.js",
      frameCss: "/h5p-standalone/styles/h5p.css",
    }).catch((e: unknown) => setError(`Preview failed to render: ${(e as Error).message}`));
  }, [result, playerReady]);

  const run = useCallback(
    async (mode: "generate" | "refine") => {
      setError("");
      setLoading(mode);
      try {
        const body =
          mode === "refine" && result
            ? { content, instruction, previousSpec: result.spec }
            : { content };
        const res = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        setResult(data as DemoResult);
        setInstruction("");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading("");
      }
    },
    [content, instruction, result],
  );

  return (
    <div className="wrap">
      <h1>H5P ChatGPT App <span className="pill">demo harness</span></h1>
      <p className="lede">
        Paste learning content &rarr; get an interactive H5P activity &rarr; refine it in words &rarr;
        export a real <code>.h5p</code> file. In the shipped product this all happens inside ChatGPT;
        here a direct model call stands in for that step.
      </p>

      <div className="grid">
        <div className="panel">
          <h2>1 &nbsp;Content</h2>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste lecture notes, an article, a lesson summary…"
          />
          <div className="row">
            <button onClick={() => run("generate")} disabled={!!loading || !content.trim()}>
              {loading === "generate" ? "Generating…" : "Generate quiz"}
            </button>
            <button
              onClick={() => setContent(SAMPLE)}
              style={{ background: "transparent", color: "var(--muted)", padding: "9px 4px" }}
            >
              reset sample
            </button>
          </div>

          {result && (
            <>
              <h2 style={{ marginTop: 24 }}>3 &nbsp;Refine</h2>
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder='e.g. "make question 2 harder" or "add a question about runoff"'
                onKeyDown={(e) => e.key === "Enter" && instruction.trim() && run("refine")}
              />
              <div className="row">
                <button onClick={() => run("refine")} disabled={!!loading || !instruction.trim()}>
                  {loading === "refine" ? "Updating…" : "Apply change"}
                </button>
              </div>
            </>
          )}

          {error && <div className="error">{error}</div>}
          {error.includes("OPENAI_API_KEY") && (
            <p className="muted" style={{ marginTop: 8 }}>
              Set <code>OPENAI_API_KEY</code> (locally in <code>.env</code>, or on Vercel with{" "}
              <code>vercel env add OPENAI_API_KEY production</code> then redeploy). The{" "}
              <code>/api/mcp</code> ChatGPT App does not need it.
            </p>
          )}
        </div>

        <div className="panel">
          <h2>2 &nbsp;Interactive activity</h2>
          {!result && <p className="muted">Your generated activity will appear here.</p>}
          {result && (
            <>
              <div style={{ marginBottom: 10 }}>
                <strong>{result.spec.title}</strong>{" "}
                <span className="muted">
                  · {result.spec.questions.length} questions · pass {result.spec.passPercentage}%
                </span>
              </div>
              <div className="h5p-host" ref={hostRef} />
              <div className="row">
                <a className="dl" href={result.downloadUrl}>Download .h5p</a>
                <span className="muted">
                  Import into <a href="https://h5p.com" target="_blank" rel="noopener">h5p.com</a> or{" "}
                  <a href="https://lumi.education" target="_blank" rel="noopener">Lumi</a>.
                </span>
              </div>
              <details>
                <summary>What the ChatGPT tool call looks like</summary>
                <pre>{JSON.stringify(result.spec, null, 2)}</pre>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
