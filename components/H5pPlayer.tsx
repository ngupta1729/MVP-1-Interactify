"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    H5PStandalone?: { H5P: new (el: HTMLElement, opts: Record<string, unknown>) => Promise<unknown> };
  }
}

/**
 * Renders a built quiz interactively using h5p-standalone.
 * `playerPath` is the `/api/h5p/<token>/player` base that serves the unpacked package.
 */
export default function H5pPlayer({ playerPath }: { playerPath: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    function mount() {
      if (cancelled || !hostRef.current || !window.H5PStandalone) return;
      const host = hostRef.current;
      host.innerHTML = "";
      const el = document.createElement("div");
      host.appendChild(el);
      new window.H5PStandalone.H5P(el, {
        h5pJsonPath: playerPath,
        frameJs: "/h5p-standalone/frame.bundle.js",
        frameCss: "/h5p-standalone/styles/h5p.css",
      }).catch((e: unknown) => !cancelled && setError(`Preview failed to render: ${(e as Error).message}`));
    }

    if (window.H5PStandalone) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-h5p-standalone]');
      if (existing) {
        existing.addEventListener("load", mount, { once: true });
      } else {
        const s = document.createElement("script");
        s.src = "/h5p-standalone/main.bundle.js";
        s.dataset.h5pStandalone = "1";
        s.onload = mount;
        s.onerror = () => !cancelled && setError("Could not load the H5P player runtime.");
        document.body.appendChild(s);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [playerPath]);

  return (
    <>
      <div className="h5p-host" ref={hostRef} />
      {error && <div className="error">{error}</div>}
    </>
  );
}
