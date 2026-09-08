# MVI Spec — H5P ChatGPT App (Crawl / first version)

_Created 2026-09-08. This is the "minimum viable interesting" build for the Sprint 2
cohort demo. Deliberately narrow; expected to be rewritten as we learn._

## One-line

Inside ChatGPT, turn learning content into an interactive H5P quiz you can refine by
chatting, and export as a valid `.h5p` file.

## Demo objective (what the cohort demo must get feedback on)

1. **Primary — the conversational handoff.** Does "content in → interactive activity out →
   refine in words → export" feel valuable and natural enough that a teacher / course
   creator would use it instead of a separate H5P authoring tool?
2. **Secondary — the ChatGPT App bet.** Is "bring H5P to where users already are (ChatGPT),
   and give them a reason to come back to H5P (the export)" the right distribution move?

Output quality of individual questions is explicitly *not* the focus — that rides on
ChatGPT and is easy to improve later.

## Top quality risk this version addresses

**Can a valid `.h5p` be generated programmatically?** Mitigation: the package is built from
the official H5P Hub bundle's exact structure, with the full runtime-library dependency
closure vendored in. Verified structurally by `npm run h5p:smoke`; verified by real import
in the demo-prep checklist below.

## In scope

- One H5P activity type: **Question Set** built from **Multiple Choice** questions
  (single- or multi-correct, optional per-answer feedback, pass percentage).
- MCP server (`/api/mcp`) exposing `create_h5p_quiz` with an inline preview component —
  this is the real ChatGPT App.
- Demo harness (`/` + `/api/demo`) that uses a direct OpenAI call in place of ChatGPT, with
  an embedded live H5P player (h5p-standalone) and a Download `.h5p` button.
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
