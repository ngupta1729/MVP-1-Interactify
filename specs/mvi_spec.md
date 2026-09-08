# MVI Spec — H5P AI capability layer (Crawl / first version)

_Created 2026-09-08. This is the "minimum viable interesting" build for the Sprint 2
cohort demo. Deliberately narrow; expected to be rewritten as we learn._

## One-line

An **AI capability layer for H5P, exposed over MCP** — any AI assistant (ChatGPT first,
then Claude and other MCP clients) turns learning content into an interactive H5P activity
you refine by chatting, and export as a valid `.h5p` file. Same model as Kahoot, which
ships both a ChatGPT App *and* an MCP server.

## Demo objective (what the cohort demo must get feedback on)

1. **Primary — the conversational handoff.** Does "content in → interactive activity out →
   refine in words → export" feel valuable and natural enough that a teacher / course
   creator would use it instead of a separate H5P authoring tool?
2. **Secondary — the capability-layer bet.** Is "H5P as an MCP capability layer that plugs
   into whatever AI assistant the user already has (ChatGPT first)" the right shape for the
   product — versus a single-platform plugin?

Output quality of individual questions is explicitly *not* the focus — that rides on the
AI assistant and is easy to improve later.

### Open strategic question (start probing it in the demo; don't claim an answer)

`.h5p` is an **open format** — the output plays in Lumi, any LMS, self-hosted. So once the
AI can generate a valid one, **what is the real reason a user would choose h5p.com / the
vendor's hosted product at all?** Hosting isn't a moat. Candidate answers to test with
users — the living edit/track/version loop, xAPI analytics, a validity/accessibility
guarantee, or the capability layer being the product itself — are tracked in
`reports/builder_priorities.md`. Treat this as a **Stage 1 user-research** question, not a
demo claim.

## Portability (be precise in the demo)

- The **capability is portable today**: `/api/mcp` is a standard MCP server; any MCP client
  (ChatGPT, Claude Desktop, Claude Code, MCP Inspector) can connect, describe content, and
  get a valid `.h5p` back. The tool returns the download URL as plain model-visible text, so
  nothing core depends on a ChatGPT-only affordance.
- The **inline playable preview** (quiz rendered *inside* the chat) is a ChatGPT Apps SDK
  feature for now (`ui://` skybridge component). Claude's rich MCP-UI story is less mature,
  so other clients currently get the tool + the `.h5p`, not the embedded widget.

## Top quality risk this version addresses

**Can a valid `.h5p` be generated programmatically?** Mitigation: the package is built from
the official H5P Hub bundle's exact structure, with the full runtime-library dependency
closure vendored in. Verified structurally by `npm run h5p:smoke`; verified by real import
in the demo-prep checklist below.

## In scope

- One H5P activity type: **Question Set** built from **Multiple Choice** questions
  (single- or multi-correct, optional per-answer feedback, pass percentage).
- MCP server (`/api/mcp`) exposing `create_h5p_quiz` — a standard MCP server any assistant
  can connect to. The inline preview component is an additive ChatGPT Apps SDK add-on;
  other clients ignore it.
- Demo harness (`/` + `/api/demo`) that uses a direct OpenAI call in place of an AI
  assistant, with an embedded live H5P player (h5p-standalone) and a Download `.h5p` button.
- Conversational refinement = re-run with an instruction ("make Q2 harder", "add a question
  about X").
- Stateless: a quiz is identified by an encoded token, rebuilt on demand. No database.

## Out of scope (deferred)

- Any activity type other than Question Set.
- Publishing the app in the ChatGPT directory / OpenAI app review.
- Auth, accounts, saved quizzes, usage limits, persistence.
- Editing individual H5P widget fields by hand.
- Importing existing `.h5p` files to edit.

## Demo scenario (the thing that must work start to finish)

1. Open the demo page. Paste a paragraph of lecture notes (sample provided: the water cycle).
2. Click **Generate quiz**. Within a few seconds an interactive multiple-choice quiz renders
   in the page and can be answered, checked, and scored.
3. Type a refinement — e.g. _"add a question about transpiration"_ — and apply it. The quiz
   updates in place.
4. Click **Download .h5p**. The file imports into h5p.com (or Lumi) and plays there.
5. Narrate: in the product, steps 1–3 happen as a normal ChatGPT conversation calling the
   `create_h5p_quiz` tool; show the tool-call JSON panel and the MCP Inspector call.

## Definition of done

- [x] `create_h5p_quiz` (MCP) builds a `.h5p` and returns preview data + a working download URL.
- [x] Demo page: content → generated quiz → refine → download, working end to end locally.
- [x] Embedded H5P player renders the generated quiz.
- [x] `npm run h5p:smoke` passes (package is structurally valid).
- [ ] Deployed to a public URL (Vercel).
- [ ] Generated `.h5p` confirmed to import and play in **h5p.com** and/or **Lumi** (manual).
- [ ] 60–90s demo recording captured against the scenario above.

## Demo-prep checklist

- [ ] Deploy; set `OPENAI_API_KEY` on Vercel.
- [ ] Run the full scenario on the deployed URL.
- [ ] Download a `.h5p`, import to h5p.com and Lumi, confirm it plays and scores.
- [ ] Connect `/api/mcp` in MCP Inspector; screenshot the `create_h5p_quiz` call + result.
- [ ] Record the walkthrough; write 3 specific questions to ask the cohort (tied to the demo
      objective above).
