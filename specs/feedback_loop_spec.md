# Feedback Loop Spec — usage analytics for H5P activities (MVP 2 direction)

_Created 2026-09-11. Scopes the analytics/feedback-loop direction chosen over "publish
directly to a platform" for MVP 2 — see `reports/builder_priorities.md` for why the
publish-to-platform idea is deferred (blocked on two external API gaps, tracked there)._

## One-line

Turn real interaction data from the H5P activities we generate into two things: **feedback
the creator can see** (did this quiz actually work for real learners?), and **feedback that
automatically improves what ChatGPT generates next**, without training a model of our own.

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
| Take the quiz → **real H5P** | **Yes**, natively (`H5P.externalDispatcher`) — same-window, since we use `embedType:"div"`, no iframe boundary to cross | Every answer, correct/incorrect, completion, score, per-question timing | Nothing — gold-standard path |
| Take the quiz → **JS fallback** | No — hand-built runner, not H5P.js | Everything, *if instrumented* — we own the code, can emit events in the same shape (answered/completed) | Nothing once built; today, nothing is captured |
| Download `.h5p` | No — leaves our system | The click ("download initiated") | Whether it's ever opened/imported/played anywhere — permanently |
| Open in H5P player ↗ (`/play/<token>`) | Yes, real H5P mount — but a **separate page**, invisible to the widget's JS | The click, from the widget. Actual play-through only if `/play` independently listens + reports (correlated by token) | Nothing to the widget; solvable with its own wiring |
| Downloaded file used elsewhere (h5p.com / Moodle / Lumi / offline) | N/A | Nothing | Fully, permanently — that's what handing someone an open file means |

**Practical read:** real signal only exists where the real H5P runtime actually renders
(in-card or on `/play`), or wherever we deliberately instrument the fallback. Download and
"open elsewhere" give intent, never outcome.

## What to measure — activation + satisfaction, not click counts

**Learner side** (harder, more valuable — it's the actual pedagogical output):
- Completion rate (started vs. finished) — abandonment is the strongest negative signal.
- Score distribution — everyone at 100% ⇒ weak discrimination; most failing badly ⇒
  ambiguous/poorly-worded questions. Content-quality signals, not usage signals.
- Retry + score delta — retry with improvement = learning; retry with no improvement =
  probably a confusing question.
- Time-to-answer per question — very fast ⇒ guessing/trivial; very long ⇒ confusing wording.
- Explicit signal: a one-tap 👍/👎 on the results screen — cheap, direct, complements the
  inferred behavioral proxies rather than replacing them.

**Creator side** (adoption of the tool itself):
- "Take the quiz" conversion — of those who saw the answer-key preview, who engaged further?
- Refinement count before settling — one-shot acceptance ⇒ high first-pass quality; many
  cycles ⇒ the AI isn't nailing it unprompted.
- Download vs. take-in-card ratio — is the in-card experience good enough to *be* the
  product, or is this just a fancy file generator to people?

**Operational (delivery quality, not content quality):** real-H5P vs. fallback rate — also
finally answers the open README question on how often the fallback shows up in practice.

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

Education data about real learners — anonymous by default (a random session id, never a
name or email) unless a school explicitly opts into identified tracking, which is a much
bigger compliance surface (FERPA territory for K-12 use). Decide this deliberately, not by
omission.

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

- Where does the creator actually see this feedback — appended to the widget's results
  view, a small `/insights/<token>` page, or both?
- What's the right aggregation window/sample size before a "quality nudge" is trustworthy
  enough to surface in a tool response, versus noise from too few data points?
- Does the explicit 👍/👎 belong on the learner's results screen, the creator's card, or both
  — they're answering different questions ("did I enjoy this" vs. "did this work for my
  class").
