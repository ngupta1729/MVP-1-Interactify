# Project Journey — project2608b

> Living map of how this project gets built. **The spine is the Sherpa-B workflow.**
> This file stays lean and is updated at each milestone. The verbatim question/answer
> transcript lives in [[journey-log]] (append-only).

---

## Where I am now

| | |
|---|---|
| **Stage** | 0 — Get Started Building |
| **Last milestone** | First version built & deployed — https://project2608b.vercel.app — 2026-09-08 |
| **Next action** | In ChatGPT (Work workspace): re-run the tool, click **▶ Play here** in the card — confirm the quiz plays inline (MVP 1.1 ChatGPT) · import a `.h5p` into h5p.com/Lumi · record the demo (`sprint-demo-prep`). See `docs/mvp-log.md`. |
| **Project idea** | **H5P AI capability layer (MCP)** — any AI assistant (ChatGPT first, then Claude/other MCP clients) turns content into interactive H5P activities via an MCP server; refine conversationally, export `.h5p`. Same model as Kahoot (ships a ChatGPT App **and** an MCP server). Autonomy: **Level 2 — Collaborator**. |
| **Goal** | Crawl→Walk→Run. Crawl = launchable MVP this week. Program ends **Sep 18, 2026**. |
| **Open risks in focus** | trajectory (Stage 0), then value (Stage 1) |

---

## The workflow (spine)

```mermaid
flowchart TD
    subgraph S0["Stage 0 · Get Started Building  (risk: trajectory)"]
        A0["Set up env + tools"] --> A1["Define project idea<br/>/orientation"]
        A1 --> A2["Build v1 of the app"]
        A2 --> A3["Demo &amp; gather feedback"]
        A3 --> A4["Capture feedback,<br/>update the plan"]
    end
    subgraph S1["Stage 1 · Validate With Real Users  (risk: value)"]
        B0["User-research planning<br/>/user-research"] --> B1["Conduct user interviews"]
        B1 --> B2["Synthesize insights + next steps"]
    end
    subgraph S2["Later · Reach → Economics → Fundraising"]
        C0["Distribution / reach"] --> C1["Monetization"]
        C1 --> C2["Investor conversations"]
    end
    A4 --> B0
    B2 --> C0

    classDef done fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20;
    classDef current fill:#fff3c4,stroke:#f9a825,color:#5f4300;
    classDef todo fill:#eceff1,stroke:#90a4ae,color:#37474f;
    class A0,A1,A2 done;
    class A3 current;
    class A4,B0,B1,B2,C0,C1,C2 todo;
```

Legend: 🟩 done · 🟨 current · ⬜ not started

---

## Stages

### Stage 0 — Get Started Building  🟨 in progress

**Objective:** Stand up the build environment and the program assistant, then lock in a
concrete project idea and ship a first version to react to.

**Risk dimension:** trajectory (are we set up to move at all?)

**Milestones**
- [x] **Sherpa-B project initialized & bound** — 2026-09-08
- [x] **Orientation complete** — workspace dirs, profile, project idea, autonomy level — 2026-09-08
- [x] **First version built & deployed** — H5P quiz MCP server (ChatGPT-ready) + demo harness, live on Vercel — 2026-09-08
- [x] **MVP 1 (Claude Desktop)** — tool connected to Claude Desktop, generated a 7-question quiz end to end — 2026-09-09
- [x] **MVP 1.1 (Claude Desktop)** — `/play/<token>` browser-playable link — **works**; quiz plays, so the `.h5p` is confirmed to play (not just structurally valid) — 2026-09-09
- [x] **MVP 1.2 (Claude Desktop)** — inline MCP-UI resource — **Claude Desktop does not render it**; inline experience comes from ChatGPT instead — 2026-09-09
- [x] **MVP 1 (ChatGPT)** — connector added (in the **Work/Business workspace**); ChatGPT calls the tool and **renders the inline card** (answer key + Play/Download) — 2026-09-09
- [~] **MVP 1.1 (ChatGPT)** — "▶ Take the quiz" in the card: a self-contained JS quiz runner (answer/check/score) — the skybridge sandbox blocks embedding the real H5P runtime (external script AND iframe), so this mirrors Kahoot's self-contained inline preview; deployed, awaiting an in-ChatGPT test — 2026-09-09
  - remaining: confirm MVP 1.1 (ChatGPT) works in the card · `OPENAI_API_KEY` on Vercel · confirm `.h5p` imports into h5p.com/Lumi · record demo
  - full log: `docs/mvp-log.md` (Track A = Claude Desktop, Track B = ChatGPT)
- [ ] App demoed, cohort feedback gathered
- [ ] Feedback captured, plan updated

**Key decisions**

| Date | Decision | Rationale | Alternatives considered |
|---|---|---|---|
| 2026-09-08 | Project name `project2608b`, bound to git root commit `a763e55` | project-init anchors the Sherpa-B project to the repo's git identity; folder name is the default | — |
| 2026-09-08 | Journey record as two files: `journey.md` (lean spine) + `journey-log.md` (append-only transcript) | Keeps per-turn token/latency cost low; the big log is only ever appended to | Single file (rejected: grows unbounded) |
| 2026-09-08 | Visuals via Mermaid in markdown; Obsidian vault = project root | Renders free in Obsidian/GitHub; plain text, cheap to edit | Obsidian Canvas (rejected: manual upkeep) |
| 2026-09-08 | **Project pivot:** H5P ChatGPT App (was: `project2608a` predictive-maintenance copilot) | New repo, fresh idea the participant is excited to build hands-on | — |
| 2026-09-08 | **Build as a ChatGPT App** (Kahoot-style), not a standalone tool on the raw OpenAI API | ChatGPT supplies AI + intent; H5P app is the tool layer. Matches the reference model | Standalone OpenAI-API tool |
| 2026-09-08 | **Starting autonomy = Level 2, Collaborator** | App drafts a full activity; human reviews/approves before use. A floor to level up from, not a ceiling | L1 Assistant · L3 Agent |
| 2026-09-08 | **Crawl = launchable MVP**, binge this week | ~10 days to final demo (Sep 18); prove the core handoff fast, then get real feedback | Full multi-feature build (deferred to Walk/Run) |
| 2026-09-08 | Telemetry backup mode: `backup_full_observation_log`; applied settings permission allowlist | Fuller mentor visibility; fewer permission prompts during workouts | progress-only mode |
| 2026-09-08 | **First version = one activity type: H5P Question Set (multiple choice)** | Most recognizable "interactive activity", maps cleanly from notes, best-documented H5P format | Flashcards · Fill-in-the-Blanks · Interactive Summary |
| 2026-09-08 | **Build as a real MCP server** (`/api/mcp`), + a demo harness that fakes the ChatGPT side | It *is* the product; participant has no paid ChatGPT dev-mode account, so the harness (direct OpenAI call) makes it demoable now | Local-only prototype · CLI |
| 2026-09-08 | **No LLM / API key in the app itself** — ChatGPT is the model, it calls the tool with structured questions | The defining property of the ChatGPT App model; cheaper, simpler, no per-use AI cost | Standalone tool calling OpenAI directly |
| 2026-09-08 | **`.h5p` built from the official H5P Hub bundle**, runtime libs vendored (`lib/h5p/vendor`) | Directly de-risks the #1 quality risk (valid `.h5p`); guaranteed-correct library set + versions | Hand-write `h5p.json` deps (fragile) · library-light package (import-only) |
| 2026-09-08 | **Stateless: a quiz's id = gzip+base64url of its `QuizSpec`** | Rebuilds on any Vercel instance; no DB / blob store to set up during a binge | In-memory Map (breaks across lambdas) · Vercel Blob (setup overhead) |
| 2026-09-08 | Deploy target: **Vercel** (`project2608b.vercel.app`), production, no deployment protection | Public HTTPS URL needed for an MCP server; participant chose Vercel; CLI already authed | Self-host · ngrok tunnel |
| 2026-09-08 | **Reframe: the product is H5P's AI capability layer over MCP**, not "an H5P ChatGPT App". ChatGPT is the first interface; Claude + other MCP clients next. | Kahoot ships both a ChatGPT App and an MCP server; OpenAI's Apps SDK is MCP-based and portable; a capability layer is bigger and more defensible than a single-platform plugin. Costs ~nothing — the v1 server already is a standard MCP server; the ChatGPT bits are additive `_meta` + a `ui://` component. | Stay "ChatGPT App" only |
| 2026-09-08 | Studied the **Kahoot ChatGPT app** (support docs) as the reference UX. Confirms: draft-first (create/update only), ≤20 questions/prompt, inline preview, NL edits, ~2 question types, and a **button that opens the draft back in the platform**. Kahoot monetizes save/host (free tier = 5 questions), not generation. | Best concrete validation of the model. Surfaces our v1 UX gap (manual `.h5p` download vs. one-click "open in [platform]") **and** the open monetisation/incentive question — Kahoot's format is proprietary so its host lock-in works; `.h5p` is open, so neither the gap's value nor the incentive is proven yet. Both → Stage 1 user research. | — |

**Learnings & concepts**
- **Sherpa-B** = agentic innovation-management platform. Idea → build → reach → monetize → fundraise, via guided/freestyle tasks + a telemetry layer.
- **Six risk dimensions:** `value`, `engineering`, `trust`, `trajectory`, `economics`, `distribution`. Each Block targets one.
- **Structure:** **Blocks** hold ordered **Tasks** (topological `do_before`/`do_after`). `guided` tasks run as **workouts** with an Acquire→Shape→Deliver loop per state.
- **Persistence model:** workouts write **structured log entries** (`shb_telemetry.track_event log_entry`, typed: decision/fact/preference/constraint/contract) + **prose docs** in `reports/`. Server profile holds project fields. Don't duplicate between them.
- **Autonomy spectrum:** L1 Assistant (AI does legwork, human executes) · L2 Collaborator (AI drafts, human approves) · L3 Agent (AI decides within bounds, human reviews exceptions). Start low, level up as trust builds.
- **H5P** = open framework for interactive HTML5 learning content (quizzes, interactive video, drag-and-drop, branching). Output is a `.h5p` package.
- **Program reality:** 2608 is a **4-week** program (not 7). Final Demo **Sep 18, 2026** — ~10 days out as of orientation.

**Open questions / risks**
- Is the "content → interactive activity" handoff a real pain worth solving? (value risk — Stage 1; this is the primary thing the first demo asks the cohort)
- ~~Feasibility of generating a valid `.h5p`~~ — addressed: builder produces a structurally
  valid Question Set from the official Hub bundle. Still to confirm by real import into
  h5p.com / Lumi.
- ChatGPT App integration not yet tested inside ChatGPT (no paid dev-mode account) — the MCP
  server is real and Inspector-tested; ChatGPT-side is narrated/recorded for now.
- **Monetisation / incentive:** once AI generates a portable `.h5p`, what makes a user pay
  for (or return to) the vendor's product? Hosting isn't a moat — open format. Candidates:
  living edit/track loop, xAPI analytics, a validity/accessibility guarantee, or selling the
  capability layer directly. Stage 1 user-research question — see `reports/builder_priorities.md`.
- No users lined up yet for the Final Demo test.
- Telemetry backup can't reach the server: "no sherpa-b MCP credentials found" — events log locally only. Consider `/shb-doctor`.

---

### Stage 1 — Validate Your Idea With Real Users  🔒 locked (needs 50% of Stage 0)

**Objective:** Put the build in front of real users and pressure-test whether it delivers value.

**Risk dimension:** value

**Milestones**
- [ ] User-research planning workout (`/user-research`)
- [ ] Conduct user interviews to validate quality risk
- [ ] Synthesize research insights + decide next steps

_Decisions / learnings: to be filled in when this stage opens._

---

### Stage 2+ — Reach, Economics, Fundraising  ⬜ not yet scoped

Distribution/reach → monetization → investor conversations. Details load from Sherpa-B as
earlier stages complete.

---

## Running summary

**2026-09-08 (build) —** Built and deployed the **first version**: a standard MCP server at
`/api/mcp` with one tool, `create_h5p_quiz`, that turns a structured question list (which the
AI assistant writes from the user's content) into a valid, self-contained `.h5p` **Question
Set** and returns a download link — plus an inline preview when the client is ChatGPT. Any
MCP client can connect. Because the participant has no paid ChatGPT developer-mode account,
there's also a **demo harness** (`/` + `/api/demo`) that uses a direct OpenAI call in place
of the assistant, with a live embedded H5P player and a
conversational refine loop. The `.h5p` builder stitches generated JSON into the official H5P
Hub library bundle (vendored), and the whole app is stateless — a quiz's id *is* its
compressed spec, so it rebuilds on any serverless instance. Verified end-to-end locally and
on the deployed URL (`https://project2608b.vercel.app`). Remaining before the cohort demo:
set `OPENAI_API_KEY` on Vercel, confirm a generated `.h5p` plays in h5p.com / Lumi, record
the walkthrough.

Later that day, **reframed the product**: it's H5P's *AI capability layer over MCP*, with
ChatGPT as the first interface (Claude and other MCP clients next) — not "an H5P ChatGPT
App". The v1 code already is exactly this; the change is positioning + roadmap. Studied the
**Kahoot ChatGPT app** as the reference UX (they run the same dual model — a ChatGPT App
*and* an MCP server): it's draft-first, ≤20 questions/prompt, inline preview, natural-language
edits, ~2 question types, and a button that opens the draft back in Kahoot; Kahoot monetizes
saving/hosting, not generation. The one UX gap in our v1 vs. Kahoot: we hand back a `.h5p`
file to import by hand, rather than a one-click "open in \[platform\]". Closing that round-trip
is a **candidate** for Walk — but the participant flagged that, unlike Kahoot's proprietary
format, `.h5p` is open, so "come back to h5p.com" isn't a moat and it's not yet clear what the
real vendor incentive is. Both — does the round-trip loop matter to teachers, and what is the
incentive — are Stage 1 user-research questions (see `reports/builder_priorities.md`).

**2026-09-09 —** First real-client validation. Connected the deployed MCP server to **Claude
Desktop** as a custom connector (Claude Pro) and generated a 7-question water-cycle quiz end
to end, with the refine loop — **MVP 1 (Claude Desktop)**. Confirmed "any MCP client, not
just ChatGPT" is real, and the questions the assistant writes from source content are good.
Claude Desktop shows the tool result + a download link but **no inline preview** (our widget
is ChatGPT-only `+skybridge`). Added two increments: **MVP 1.1** — the tool returns a
`/play/<token>` link that opens the quiz fully interactive in a browser tab (new
`app/play/[token]` page + shared `components/H5pPlayer`); **MVP 1.2** — the tool also returns
an MCP-UI resource (`ui://h5p-quiz/<token>`, HTML iframing the play page) so MCP-UI-capable
clients can render the quiz inline. Tested from Claude Desktop: **MVP 1.1 works** — the Play
link opens the quiz and it plays (which also confirms the generated `.h5p` genuinely plays,
not just validates structurally). **MVP 1.2 does not** — Claude Desktop doesn't render
tool-result UI resources inline; the resource is left in the response for other clients, and
the real inline experience will come from ChatGPT's skybridge widget. So the current picture:
Claude = link-based, ChatGPT = inline card.

Then got the connector working in **ChatGPT** (it was available in the **Work/Business
workspace**, not personal Plus) — **MVP 1 (ChatGPT)**: ChatGPT calls `create_h5p_quiz` and
**renders our inline widget** (an answer-key preview + ▶ Play / Download buttons). The thing
Claude Desktop couldn't do. Built **MVP 1.1 (ChatGPT)** on top: a "▶ Play here" toggle that
embeds the real `h5p-standalone` player *inside* the card (with `openai/widgetCSP` +
cross-origin CORS so it loads from our domain). Deployed; awaiting an in-ChatGPT test. The
milestone log now runs two tracks — `docs/mvp-log.md` Track A (Claude Desktop) / Track B
(ChatGPT).

**2026-09-08 (orientation) —** Started on an empty repo. Connected Sherpa-B (`project-init` → *created*),
project `project2608b` bound to the repo. Set up the journey record (two files, Mermaid spine)
and an Obsidian vault at the project root. Ran the **Orientation** workout end to end:
created the workspace dirs, seeded `.claude/settings.json` + `CLAUDE.md`, and built out the
participant profile. Landed on the project: an **H5P ChatGPT App** (a deliberate pivot from
the earlier predictive-maintenance idea) — go from AI content/conversation in ChatGPT straight
to a refinable interactive H5P activity, built as a Kahoot-style ChatGPT App, at **autonomy
Level 2 (Collaborator)**. Goal is a **launchable Crawl MVP this week** (final demo Sep 18).
Committed as `0bd4f47`. Next: `/coach`, then start building the first version via Ideation.

---

## Change log

| Date | Change |
|---|---|
| 2026-09-08 | Journey record created; Stage 0 mapped; Sherpa-B connection milestone logged |
| 2026-09-08 | Obsidian vault set to project root; `.gitignore` added; `2608b/` subfolder removed |
| 2026-09-08 | Orientation workout complete: workspace, profile, project idea (H5P ChatGPT App), Level 2 autonomy, Crawl MVP goal. Commit `0bd4f47`. |
| 2026-09-08 | First version built: Next.js app at repo root — MCP server (`create_h5p_quiz`) + demo harness + `.h5p` Question Set builder. Deployed to `project2608b.vercel.app`. `specs/mvi_spec.md` added. |
| 2026-09-08 | Product reframed to "H5P AI capability layer (MCP), ChatGPT first"; `specs/mvi_spec.md`, `journey.md`, `README.md` updated. Kahoot ChatGPT app studied as reference UX. |
| 2026-09-09 | MVP 1 validated in **Claude Desktop** (custom connector, 7-question quiz E2E). Added MVP 1.1 (`/play/<token>` browser preview link) + MVP 1.2 (inline MCP-UI resource — Claude doesn't render it). `docs/mvp-log.md` started. |
| 2026-09-09 | **MVP 1 (ChatGPT)** — connector working in the Work/Business workspace; ChatGPT renders the inline widget. **MVP 1.1 (ChatGPT)** — "▶ Play here" embeds the interactive player in the card (`openai/widgetCSP` + CORS); deployed. `docs/mvp-log.md` split into Track A / Track B. |
