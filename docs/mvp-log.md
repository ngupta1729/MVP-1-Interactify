# MVP log

Versioned milestones for the H5P AI capability layer. Each entry: what shipped, how it was
built, where it was validated, and what it exposed. Newest at the bottom.

Product = an MCP server: `https://project2608b.vercel.app/api/mcp`.
Setup per client: `docs/testing-in-ai-clients.md`.

---

## MVP 1 (Claude Desktop) — first working end-to-end in a real MCP client · 2026-09-09

**What:** `create_h5p_quiz` connected to **Claude Desktop** as a native custom connector
(Claude Pro → Settings → Connectors → Add custom connector →
`https://project2608b.vercel.app/api/mcp`, no auth). In a chat, pasted a paragraph about the
water cycle → Claude wrote the questions and called the tool → got back a **7-question H5P
Question Set** as a downloadable `.h5p`. Refinement ("make Q2 harder", "add a question about
transpiration") worked by re-calling the tool.

**How:**
- MCP server: Next.js on Vercel (`mcp-handler`), one tool, stateless — a quiz's id is the
  gzipped+base64url `QuizSpec`, so any serverless instance rebuilds it.
- `.h5p` built by stitching generated `h5p.json` + `content/content.json` into the **official
  H5P Hub library bundle** (8 runtime libs vendored) — guaranteed-valid package, not a guess.
- The tool description tells the assistant to write the questions and call with the full
  list; refine = call again.

**Validated:** the "any MCP client, not just ChatGPT" claim is real. The AI writes good
questions from source content. The refine loop feels natural. `.h5p` downloads via a plain
URL.

**Gaps this exposed:**
1. No interactive preview inside Claude Desktop — you get a link, then open the `.h5p`
   elsewhere (Lumi / h5p.com). → addressed by MVP 1.1 / 1.2.
2. Still not opened in a real H5P player to confirm it *plays* (structurally validated only).
3. The "why the vendor's product?" question — `.h5p` is portable, so hosting isn't a moat
   (see `reports/builder_priorities.md`).

---

## MVP 1.1 (Claude Desktop) — play-in-browser link · 2026-09-09

**What:** the tool result now includes a **`Play in a browser` URL** (`/play/<token>`).
One click opens the quiz as a fully interactive H5P activity in a browser tab — answer,
check, score. Works from Claude Desktop, ChatGPT, MCP Inspector, anywhere the link is shown.

**How:**
- `app/play/[token]/page.tsx` — decodes the token, renders the quiz with `h5p-standalone`
  (the player already serves the unpacked package at `/api/h5p/<token>/player`).
- `components/H5pPlayer.tsx` — shared player, also used by the demo page.
- `playUrl` added to the tool's text output and `structuredContent`; demo API + ChatGPT
  widget get a **▶ Play** button.

**Validated:** `/play/<token>` renders on the deployed URL; player assets serve; bad tokens
show a friendly message.

**Not closed:** the preview is a browser tab, not embedded in the chat. That's MVP 1.2.

---

## MVP 1.2 (Claude Desktop) — inline MCP-UI panel (experimental) · 2026-09-09

**What:** the tool result also returns an **MCP-UI resource** — content item
`{ type: "resource", resource: { uri: "ui://h5p-quiz/<token>", mimeType: "text/html", … } }`
whose HTML iframes the `/play/<token>` page. Clients that support MCP-UI (some Claude Desktop
builds; MCP-UI renderers) show the quiz **inline in a panel**. Clients that don't ignore it
and fall back to the text + Play link from MVP 1.1.

**How:** added the resource alongside the existing `text` content and the ChatGPT
`ui://widget/quiz.html` (`text/html+skybridge`) template. All three coexist; each client
picks what it understands.

**Status:** deployed. **Whether Claude Desktop actually renders the inline panel is the open
test** — depends on the Claude Desktop version's MCP-UI support. If it doesn't light up,
MVP 1.1's Play link is the working path and nothing regresses.

---

## Next candidates (not built)

- Confirm a generated `.h5p` plays in **h5p.com** and **Lumi** (manual).
- Test **MVP 1.x in ChatGPT Plus** — including whether the `+skybridge` inline card renders
  for an unverified dev connector.
- A second H5P activity type (drag-and-drop) so the assistant can choose the format.
- "Open in [platform]" round-trip (needs an h5p.com / LMS account + API) — gated on the
  incentive question in `reports/builder_priorities.md`.
