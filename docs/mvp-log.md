# MVP log

Versioned milestones for the H5P AI capability layer. Each entry: what shipped, how it was
built, where it was validated, and what it exposed.

Product = one MCP server: `https://project2608b.vercel.app/api/mcp`.
Setup per client: `docs/testing-in-ai-clients.md`.

Milestones run on **two client tracks** — the same server, different assistants, different
rendering capabilities:

- **Track A — Claude Desktop** (link-based; no inline UI)
- **Track B — ChatGPT** (Apps SDK; renders the inline card)

Shared server/build changes (the `.h5p` builder, the `/play` page, tool output fields) are
noted where they land but benefit both tracks.

---

# Track A — Claude Desktop

## A1 · MVP 1 (Claude Desktop) — first end-to-end in a real MCP client · 2026-09-09 · ✅

`create_h5p_quiz` connected to **Claude Desktop** as a native custom connector (Claude Pro →
Settings → Connectors → Add custom connector → the MCP URL, no auth). Pasted a paragraph
about the water cycle → Claude wrote the questions, called the tool → **7-question H5P
Question Set** as a downloadable `.h5p`. Refinement worked by re-calling the tool.

**How:** Next.js MCP server on Vercel (`mcp-handler`), one tool, stateless (a quiz's id is
its gzipped+base64url `QuizSpec`). `.h5p` built by stitching generated JSON into the official
**H5P Hub library bundle** (8 runtime libs vendored).

**Validated:** "any MCP client, not just ChatGPT" is real. The AI writes good questions from
source content. Refine loop feels natural.

**Gap it exposed:** no interactive preview inside Claude Desktop — you get a link, then open
the `.h5p` elsewhere. → A2 / A3.

## A2 · MVP 1.1 (Claude Desktop) — play-in-browser link · 2026-09-09 · ✅

Tool result now includes a **`/play/<token>` URL**. One click opens the quiz as a fully
interactive H5P activity in a browser tab — answer, check, score.

**How:** `app/play/[token]/page.tsx` renders the quiz with `h5p-standalone`;
`components/H5pPlayer.tsx` shared player; `playUrl` added to tool text + `structuredContent`.

**Validated:** confirmed from Claude Desktop — the link opens and the quiz plays. This also
confirms the generated `.h5p` **actually plays**, not just that it's structurally valid.

## A3 · MVP 1.2 (Claude Desktop) — inline MCP-UI resource · 2026-09-09 · ❌ not rendered

Tool result also returns an **MCP-UI resource** (`ui://h5p-quiz/<token>`, HTML iframing the
play page). Intent: clients that support MCP-UI show the quiz inline.

**Result: Claude Desktop does NOT render it.** Claude Desktop doesn't render tool-result
HTML/UI resources inline (the MCP-UI convention is supported by some other clients, not
Claude). Not a regression — A2's link still works. Resource left in the response for other
clients.

**Conclusion:** the inline experience on Claude is not available; it comes from ChatGPT
instead (Track B).

---

# Track B — ChatGPT

## B1 · MVP 1 (ChatGPT) — inline card renders in the chat · 2026-09-09 · ✅

Added the MCP server as a **custom connector in ChatGPT** (Developer mode; it was available
in the **Work / Business workspace**, not personal Plus). Prompted for a Grade-1 solar-system
quiz → ChatGPT wrote 8 questions, called `create_h5p_quiz`, and **rendered our inline
widget** in the chat: quiz title, each question with the correct answer marked, and **▶ Play
+ Download .h5p** buttons. ChatGPT also posted a text summary with "Play the quiz online" /
"Download the H5P file" links.

**How:** the tool registers a `ui://widget/quiz.html` resource (`text/html+skybridge`) and
sets `_meta["openai/outputTemplate"]` on the tool. The widget (`lib/h5p/widget.ts`) is
vanilla JS that reads `window.openai.toolOutput` and renders a static **answer-key preview**
+ action buttons.

**Validated:** the Apps SDK path works end to end — ChatGPT calls the tool and renders the
custom component inline. This is the thing Claude Desktop could not do (A3).

**Gap it exposed:** the card is a *static* answer-key view — you can't take the quiz inside
the card; "▶ Play" opens a new tab. → B2.

## B2 · MVP 1.1 (ChatGPT) — interactive quiz inside the card · 2026-09-09 · deployed, awaiting test

The widget now has a **"▶ Play here"** toggle that swaps the answer-key preview for the real
`h5p-standalone` player, loaded on demand from our origin — so the quiz is playable
(answer / check / score) directly in the ChatGPT card. Answer-key stays the default view
(useful for review-and-approve / Level-2 autonomy); **Download .h5p** and the full-page
`/play` link stay available.

**How:**
- `lib/h5p/widget.ts` — "Play here" button lazy-loads `…/h5p-standalone/main.bundle.js` and
  mounts the player at `structuredContent.playerUrl` (`/api/h5p/<token>/player`).
- Tool returns `playerUrl` (absolute) in `structuredContent`.
- Widget resource declares `openai/widgetCSP` (`connect_domains` / `resource_domains` = our
  origin) so it works even if "Enforce CSP in developer mode" is ON.
- `next.config.ts` sets `Access-Control-Allow-Origin: *` on `/h5p-standalone/*`; the
  `/api/h5p/.../player` route already does.

**Verified server-side (2026-09-09):** `playerUrl` present; widget CSP points at the prod
origin; player assets + package files send `ACAO: *`.

**Open test:** re-run the tool in ChatGPT, click **▶ Play here** in the card, confirm the
quiz renders and is answerable inside the chat. Watch the widget console for CSP/CORS blocks
if it fails.

---

## Next candidates (not built)

- Confirm a generated `.h5p` imports and plays in **h5p.com** and **Lumi** (portability, not
  just "it plays in our own player").
- A second H5P activity type (drag-and-drop) so the assistant can choose the format.
- "Open in [platform]" round-trip (needs an h5p.com / LMS account + API) — gated on the
  incentive question in `reports/builder_priorities.md`.
- 60–90s demo recording (`sprint-demo-prep`).
