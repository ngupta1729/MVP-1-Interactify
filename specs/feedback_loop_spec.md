# Feedback Loop Spec — usage analytics for H5P activities (MVP 2 direction)

_Created 2026-09-11. Scopes the analytics/feedback-loop direction chosen over "publish
directly to a platform" for MVP 2 — see `reports/builder_priorities.md` for why the
publish-to-platform idea is deferred (blocked on two external API gaps, tracked there)._

## Approach

This is **MVP 2** — see "Approach" in [`README.md`](../README.md) for the full roadmap
(MVP 1 shipped at [`specs/mvi_spec.md`](mvi_spec.md); MVP 3+ candidates in
`reports/builder_priorities.md`).

- **Problem:** an open, portable `.h5p` gives no visibility into whether a generated
  activity is actually good, or whether educators come back — and hosting alone isn't a
  reason to pay for anything once AI can generate the file directly.
- **Use case:** capture **educator**-side activation, engagement, and export-intent
  signals (not learner data — see below); surface feedback to the educator; feed the
  aggregate signal back into what ChatGPT generates next.
- **Scope:** this document, in full, below.
- **Status:** 🟨 scoped, not yet built.

## Who the user is (important correction, 2026-09-11)

**The user is the instructional designer / educator — not the learner.** Learners interact
with the generated content on an LMS, or wherever it ends up embedded after export — a
surface we don't control and mostly can't see. Every metric below is about the educator's
behavior. Where the educator clicks "Take the quiz" inside the card or on `/play`, that's
the educator *previewing/reviewing their own draft* (matches the review-and-approve
autonomy model) — not classroom telemetry, even though the underlying xAPI events are real.

## One-line

Turn real *educator*-side interaction data into two things: **feedback the educator can
see** (activation, engagement, export intent — did this feel worth using?), and **feedback
that automatically improves what ChatGPT generates next**, without training a model of our
own.

## Why this, before publish-to-platform

`.h5p` is an open, portable file — once AI can generate a valid one, hosting isn't a moat
(the core unresolved question in `builder_priorities.md`). Usage-and-feedback data *is*
something only a live, connected product can offer — a dead file can't tell a teacher how
their quiz performed, or tell us how to generate a better one next time. This is one of the
four candidate answers to the incentive question, and unlike the other three it's ours to
start testing now, with no external dependency.

## What can and cannot produce real signal (capability matrix)

H5P content emits standard interaction events (**xAPI**) natively — nothing to build into
the content itself. What's missing is a listener + somewhere to send it, and *where* that's
even possible varies sharply by surface:

| Surface | Real H5P xAPI? | What's observable | What's structurally opaque |
|---|---|---|---|
| Answer key (default view) | No — static review, not interactive | Card opened/viewed | Nothing deeper — no interaction exists |
| Take the quiz → **real H5P** | **Yes**, natively (`H5P.externalDispatcher`) — same-window, since we use `embedType:"div"`, no iframe boundary to cross | Every answer, correct/incorrect, completion, timing — but this is the **educator previewing their own draft**, not a learner. On `/play`, it's ambiguous (educator review vs. a link shared straight to a learner) — no way to distinguish without more signal | Nothing technically — but interpret as review behavior, not classroom outcomes |
| Take the quiz → **JS fallback** | No — hand-built runner, not H5P.js | Everything, *if instrumented* — we own the code, can emit events in the same shape (answered/completed) | Nothing once built; today, nothing is captured |
| Download `.h5p` | No — leaves our system | The click ("download initiated") | Whether it's ever opened/imported/played anywhere — permanently |
| Open in H5P player ↗ (`/play/<token>`) | Yes, real H5P mount — but a **separate page**, invisible to the widget's JS | The click, from the widget. Actual play-through only if `/play` independently listens + reports (correlated by token) | Nothing to the widget; solvable with its own wiring |
| Downloaded file used elsewhere (h5p.com / Moodle / Lumi / offline) | N/A | Nothing | Fully, permanently — that's what handing someone an open file means |

**Practical read:** real signal only exists where the real H5P runtime actually renders
(in-card or on `/play`), or wherever we deliberately instrument the fallback. Download and
"open elsewhere" give intent, never outcome.

## Signal strength — most to least direct

Four sources feed the loop by now; when they disagree, trust in this order:

1. **Explicit survey response** (below) — direct from the human, unprompted. Most trustworthy.
2. **`refinementNote`** — the model's own summary of what/why it changed. Mediated, but
   still tied to real intent.
3. **Diff-based structural classification** — objective, mechanical, no "why."
4. **Behavioral proxies** (abandonment, export intent, retry) — inferred, weakest
   individually, but free and always-on, needs no one to fill anything in.

## Embedded satisfaction survey

Goal: direct signal on whether the educator had a good experience, and what they'd improve —
correcting for everything else in this spec being inferred or self-summarized.

**Design — decided 2026-09-11: one question, one screen.**

> **"Would you use this quiz as-is?"**
> 👍 Yes, as-is · 🤏 Yes, with a few tweaks · 👎 No, I'd rewrite it
> *(always-visible line beneath, optional — the tap is what's required):* "Anything
> specific you'd change?"

The 3-way tap gives the satisfaction signal and is the mandatory part (below); the free-text
line is where "what would you improve" gets caught, for whoever bothers to type — never
forced, even though the tap is.

**Moment — revised 2026-09-11: `Download .h5p` only, mandatory, blocking the download.**
Narrower and stricter than the original design: only the `Download .h5p` button is gated —
**Open in H5P player and the h5p.com/Lumi import links are unaffected**, exactly as before.
Clicking Download shows the one-tap question first; the file doesn't open until one of the
three options is tapped. The optional text line never blocks anything — only the tap does.

Why `Download .h5p` specifically, and why mandatory: this is a deliberate reversal of the
original non-blocking design, made explicitly to trade a little friction at the moment of
highest intent for near-complete response coverage — young product, needs signal fast, and
an optional prompt was likely to get a thin, self-selected response rate. Two consequences
worth remembering when reading the resulting data, not reasons to reconsider the choice:
- **The "Download .h5p click" metric changes meaning.** It now measures "clicked Download
  *and* was willing to answer," not pure download intent — someone who clicks, sees the
  question, and closes the chat rather than answer won't register as a download at all.
- Open in H5P player / h5p.com / Lumi clicks remain the *ungated* export-intent signals —
  useful as a cross-check against Download's numbers if the mandatory tap ever seems to be
  suppressing completions.

**Implementation shape, given what already exists:** the Download button's handler
currently calls `openExternal(data.downloadUrl)` directly on click — change it to first
render the one-tap question in place (`keyView()`, almost always the view showing at this
point) and only call `openExternal` once a tap is recorded. The other two export handlers
(`full`, and any future h5p.com/Lumi links) are untouched. A session-local flag (same
pattern as `mode`/`realState`) means a second Download click, after the first is answered,
goes straight through.

**Build cost is low:** a POST from the widget to a new endpoint, well within the CSP already
granted (`connect_domains` already covers exactly this pattern — no new sandbox permission
needed). Same database as the rest of MVP 2; tied to `openai/subject` for the same
anonymous-dedup reasons as the h5p.com click tracking.

**Worth watching, not solving on day one:** survey fatigue and response bias — showing this
on every card risks annoying people and skewing responses toward strong opinions only. Keep
it easily dismissible from day one; a frequency cap is a reasonable follow-up once real
response-rate data exists, not something to over-build before then.

## What to measure — educator activation + engagement, not click counts

Learner-side metrics (completion rate, score distribution among learners, etc.) are **not
measurable and not the target** — that interaction happens off-platform, on the LMS, after
export. Everything below is the educator.

**Activation** — did they reach a first real outcome?
- First successful quiz generated.
- Zero refinements needed (one-shot acceptance) — a strong positive quality signal on its
  own, not just a usage stat.
- Previewed via "Take the quiz" before exporting — shows active review, not blind trust.

**Engagement / export intent** — this is the "did they show intent to download" ask:
- "Download .h5p" click — generic export intent.
- **A more precise signal already sitting in the code, unused:** `/play/<token>` doesn't
  just have a download link — it has *separate* "Import into **h5p.com**" and "Import into
  **Lumi**" links (`app/play/[token]/page.tsx`). A click on the h5p.com link specifically is
  platform-specific intent, a materially stronger signal than a generic download. **The
  ChatGPT widget itself only offers a generic "Download .h5p" today** — no h5p.com/Lumi-
  specific link in-card — worth adding there too if this signal matters in the primary
  surface, not just on `/play`.
- "Open in H5P player ↗" click — a lighter-weight intent (reviewing before deciding).

**Retention:**
- Does the same educator come back to generate another quiz later, in a new conversation?
- Is refinement count trending down over time (product improving) or up (regressing)?

**The strongest quality-proxy we actually have, given learner data is out of reach:
abandonment.** Generated, then never previewed, never downloaded, never clicked toward
h5p.com — the conversation just stops. That's the closest thing to an implicit "wasn't good
enough to use" we can observe. Pair *low refinement + strong export intent* (good) against
*generated-then-abandoned* (bad) as the practical proxy feeding the loop below.

**Why they abandoned — partially inferable, not fully solvable, worth naming honestly.**
There's no UI moment to hook a question onto for someone who simply disengages (no download,
no preview, no refinement — nothing to gate a prompt behind), and no exit-intent signal
exists in a chat widget the way it might on a webpage. The mandatory survey (below) only
reaches the *did-download* population by construction — it structurally cannot reach
abandoners. Three partial mitigations, none a full fix:
1. **Segment abandonment against signals already logged**, instead of treating it as one
   bucket: 3+ refinements then still abandoned ⇒ content quality is the likely blocker;
   zero refinements and zero preview ⇒ ambiguous (bad output vs. unrelated reason to leave —
   genuinely indistinguishable from behavior alone, treat as noise, not a false signal);
   previewed then abandoned without downloading ⇒ they engaged with real content and it
   still didn't clear the bar, a stronger negative than never previewing; fell back to the
   lookalike runner right before leaving ⇒ a plausible *operational*, not content, cause.
2. **A conversational check-in via the tool's response text** (same lever as the fast loop,
   not a UI mechanism) — e.g. "if the user seems to be moving on without downloading or
   refining, you may ask once whether it met their needs." Advisory only; ChatGPT decides
   whether to actually say it.
3. **A retrospective ask on their next visit**, if they return at all — the next tool call's
   response can note the prior quiz was never downloaded and ask what didn't work. Only
   reaches people who come back; doesn't touch one-and-done abandoners.

**What stays genuinely unsolved:** explicit reasons from someone who leaves after one look
and never returns. A standard, well-known limit in product analytics generally — the
population most worth hearing from is structurally the hardest to reach — not something
specific to this design, and not worth over-engineering around.

**Operational (delivery quality, not content quality):** real-H5P vs. fallback rate — also
finally answers the open README question on how often the fallback shows up in practice.

## Lead-generation signal for h5p.com — what we can and can't claim

We can cleanly measure **intent**: click-through rate specifically toward the h5p.com link,
as a fraction of quizzes generated — a real, defensible number ("X% of AI-generated quizzes
result in a click toward h5p.com").

We **cannot** claim an actual **lead or conversion** from that alone — a click isn't a
signup, and we have no visibility past our own link without h5p.com's cooperation. Decided
2026-09-11: **UTM/referral parameter now**, measuring two things — **total clicks** and
**unique users who clicked**:

- **Mechanism:** route the h5p.com/Lumi links through our own redirect endpoint
  (e.g. `/api/track/h5p-click?token=<token>&uid=<anon-id>&target=h5pcom|lumi`) instead of a
  raw `<a href>`. It logs `{target, token, anon uid, timestamp}`, then 302s to the real URL
  with a UTM param attached (`utm_source=interactify` or similar). No JS beacon needed;
  survives new-tab/middle-clicks.
- **Total clicks:** a plain counter increment on that endpoint — no identity needed at all.
- **Unique users:** use **`openai/subject`** — an anonymized user id the Apps SDK sends on
  every tool call, server-side, already provided by OpenAI (confirmed via their developer
  community docs, 2026-09-11) — captured when `create_h5p_quiz` runs, and embedded (as a
  derived id, not the raw value) into the `downloadUrl`/`playUrl` we generate, so a later
  click on the tracking redirect can be deduplicated against it.
- **Real caveat, not glossed over:** `openai/subject` is ChatGPT/Apps-SDK-specific. Claude
  Desktop, MCP Inspector, and other MCP clients likely send no equivalent — so "unique
  users" will be reliable for ChatGPT usage and probably degrade to total-clicks-only,
  no dedup, elsewhere. An honest asymmetry, not a uniform mechanism.
- **Still true regardless:** this measures *intent*, not conversion. True closed-loop
  attribution (clicked *and* actually created an account) needs H5P sharing data back with
  us, or — ties to the H5P API roadmap note in `reports/builder_priorities.md` — their own
  upcoming create/extract API, which could turn "clicked toward h5p.com" into "authenticated
  with h5p.com through us." A future amplifier, not something to promise today.

## Understanding refinement patterns — a real access boundary, and what works instead

We **cannot** see or store the ChatGPT conversation — our tool only ever receives the
*structured arguments* of a call (`title`, `questions`, `passPercentage`), never the
natural-language chat that led ChatGPT to construct them. Not a build gap; the access
boundary of being an MCP tool. Even a hypothetical workaround would be a real privacy
overreach beyond what this feature needs. Two things genuinely available instead:

1. **Diff-based classification (objective, always available).** Successive versions of the
   same quiz lineage pass through us — comparing before/after tells us *what* changed
   (question added/removed, answer options changed, wording changed, pass mark changed)
   with zero access to natural language.
2. **A new optional schema field, `refinementNote`** — description instructs ChatGPT: *"If
   this is a refinement of a previous quiz, briefly say what changed and why."* The model
   *voluntarily* self-reports a short summary because we asked (same lever as everything
   else here: tool description/schema shapes behavior) — not us intercepting anything.

Together — objective diff (*what*) + the model's own stated reason (*why*) — this is a real,
buildable picture of refinement patterns. It feeds the slow loop especially directly: the
more a specific refinement reason recurs in aggregate, the more directly it becomes
tool-description guidance, so that class of refinement stops being needed at all.

## The feedback loop — two speeds; model fine-tuning is explicitly not on the table

We can't fine-tune ChatGPT — that's not ours to do, consistent with the existing "no backend
AI" decision. "Automatic improvement" here means changing what ChatGPT is *told*, via the
only lever established to work (tool description + tool response text):

- **Fast loop (per-call, genuinely automatic):** the tool's response text already rides back
  into the conversation every call. It can carry an evidence-based nudge computed from
  aggregate stats at call time (e.g. "2-option questions average 95%+ pass rates across all
  creators — consider 3–4 options"). ChatGPT reads it the same turn and can act immediately.
  No separate pipeline, no human step.
- **Slow loop (periodic, reviewed):** aggregate trends get turned into permanent additions to
  the tool's *description* — the same mechanism that already tells ChatGPT to author the
  questions and pick a content type. "Automatic" in that every future call benefits once
  updated; the *update* itself is a deliberate review step, not continuous.

## Privacy stance

This is educator usage data, not learner data (learners are out of reach — see above), which
narrows the concern considerably — but still: anonymous/pseudonymous by default (a session
or workspace id, not necessarily tied to a real name/email unless the educator is already
authenticated to us for some other reason). If a future feature (accounts, saved libraries)
introduces real identity, revisit this deliberately rather than by omission.

## New architectural fact: this needs a real database

Everything so far has been deliberately stateless (a quiz's id *is* its content). Interaction
data breaks that pattern by nature — it's new information generated over time, not
reconstructable from a link. Not a contradiction of the earlier decision (that was scoped to
quiz *content*), just a genuine first. When this gets built: provision via the `marketplace`
skill (Vercel dropped first-party Postgres/KV; routes through their Marketplace now — Neon,
Upstash, etc.), not an ad hoc pick.

## Out of scope for a first version

- Identified/named learner tracking (opt-in only, later).
- A full LRS integration — start with our own minimal event log, xAPI-shaped, so an LRS
  integration later doesn't require a schema redesign.
- Tracking inside the JS fallback runner — land the real-H5P path first, add fallback
  instrumentation once the primary loop is proven.
- Anything downstream of "download" or "open elsewhere" — structurally unobservable.

## Open questions

- Where does the educator actually see this feedback — appended to the widget's results
  view, a small `/insights/<token>` page, or both?
- What's the right aggregation window/sample size before a "quality nudge" is trustworthy
  enough to surface in a tool response, versus noise from too few data points?
- Should the h5p.com/Lumi-specific import links be added to the in-card widget (today only
  on `/play`), given that's where the stronger export-intent signal lives?
- How do we distinguish "educator previewing" from "a learner using a shared `/play` link"
  when both produce identical xAPI events? Worth resolving before trusting that data too
  heavily as a quality proxy.
