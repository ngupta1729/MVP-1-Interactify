## Finding What to Work On

At the start of a session, or whenever a participant isn't sure what to do next, run the **`coach` skill**. It pulls the participant's upcoming Sherpa-B Blocks/Tasks (`task/get-upcoming`) alongside this repo's GitHub issues, discusses priority with the participant, hands off the chosen work to a second terminal, and verifies it actually got done before moving on. This is the intended entry point for "what should I work on" - don't try to reconstruct that flow manually from the individual MCP tools.

- `task/get-details`, `task/get-recent`, `task/update-status` - inspect or update a specific Sherpa-B Task; `coach` typically drives these, but use them directly if a participant asks about one specific task.

## Setup Troubleshooting

- **`project-init` skill** - binds this repo to a Sherpa-B project; must run once per repo, from the repo root, before any other Sherpa-B tool works. If a tool call fails with a project/auth-binding error, this is the first thing to check.
- **`shb-doctor` skill** - re-checks that orientation's workspace setup (telemetry install, seed files, settings) is actually in place, and fixes anything missing. Run this if a participant's workspace seems broken or incomplete (interrupted orientation, manual edits, a plugin version bump).

## Vocabulary

- **Cognitive Gym** - the broader identity behind the program: a place to deliberately keep practicing thinking skills your job no longer demands. More: https://sherpa-b.ai.science/docs/
- **Agentic Buildcamp** - this program's specific instance of a Cognitive Gym: a mentor-led, cohort-based program for building a real AI product (formerly called "bootcamp"). More: https://sherpa-b.ai.science/docs/agentic-buildcamp/
- **KnowledgeOps** - the methodology behind Agentic Buildcamp: turning expert judgment into a repeatable, teachable process across phases from ideation through go-to-market, each producing a concrete artifact. More: https://sherpa-b.ai.science/docs/agentic-buildcamp/
- **Sherpa-B** - the guidance tool (this MCP server plus the Claude Code plugin) that runs alongside Agentic Buildcamp, walking participants through KnowledgeOps phases as guided Tasks. More: https://sherpa-b.ai.science/docs/agentic-buildcamp/
- **Cohort** - the group of participants going through Agentic Buildcamp together at the same time.
- **Mentor** - gives a participant feedback on their specific build, both synchronously and asynchronously; distinct from the optional 1-on-1 mentorship add-on, which is direct extra mentor time on top of standard cohort feedback.
- **Zone** - groups a set of related Blocks.
- **Block** - a risk-driven arc of work within a Zone.
- **Task** - a unit of work within a Block; either `guided` (Claude Code walks the participant through it, internally run as a **workout** - see below) or `freestyle` (open-ended build work).
- **Workout** - the internal engine that drives a `guided` Task's step-by-step mechanics (`activity/get-workout` / `activity/get-step-prompt`, each state following an acquire/shape/deliver pattern). You don't need to drive this by hand - `coach` and the relevant workout-running skill handle it - but if you see `workout`/`on_success`/ASD terminology in tool output, that's what it refers to.
- Blocks and Tasks unlock gradually as prerequisites are met, so there is deliberately no fixed list to memorize or enumerate up front - always discover current, actionable work live rather than assuming a fixed catalog.

## shb_telemetry

The `shb_telemetry` package workouts call directly to log step progress and, if the participant opts in, fuller observation logs back to the Agentic Buildcamp dashboard. Run any of its commands (`shb-track-event`, `python3 -m shb_telemetry.config`, `shb-check-update`, `shb-read-log`) with `--help` to see what's available rather than assuming a fixed call shape.

Telemetry backup mode is participant-controlled (`shb_telemetry.config get`/`set`): `backup_only_progress_data` (default, keeps only which activity/step they're on) vs `backup_full_observation_log` (also backs up full decision/observation content). Don't change this without asking the participant.

### Troubleshooting shb_telemetry

- A workout step failing on an `shb_telemetry` call - first check the plugin (and its bundled `shb_telemetry`) is actually auto-updating: run `/plugins`, use Claude Code's in-UI navigation to reach "Marketplaces", select the sherpa-b marketplace, and enable auto-update (exact wording may vary by Claude Code version - follow what `/plugins` shows on screen).
- A workout step's `acquire` operations installing/upgrading `shb_telemetry` before using it is expected, not an error - it keeps every later step working without depending on a stale cached install path.

## Agentic Buildcamp Info

Run:

```
mcp__sherpa-b__activity__get-bootcamp-info
```

This returns the current program structure live from the Agentic Buildcamp dashboard (tiers, schedule, mentorship support, time commitment, sprint milestones, demo formats) - always check it rather than assuming a fixed cohort length or schedule, since these vary by cohort and change between runs of the program.

## Useful Tools

### MCP Tools

- `participant/get-profile` / `participant/update-profile` - read or update the participant's stored profile.
- `activity/submit-reflection` / `activity/get-reflections` - capture and retrieve participant reflections tied to a workout step.

### Plugin Skills

- **`warm-up` skill** - start a session by reviewing recently logged telemetry, letting the participant correct anything stale or wrong before diving in.
- **`cool-down` skill** - close out a freestyle (non-workout) session: commit changes, reflect, and persist notable decisions/facts/preferences.
- **`persist-content` skill** - persist notable info from a session ad hoc, outside of any workout checkpoint.
- **`open-dashboard` skill** - get a short-lived link to open the Sherpa-B web dashboard, optionally to a specific page (e.g. roadmap, progress).
- **`sprint-demo-prep` skill** - help a participant prepare a timed script and recording checklist for their sprint demo video.
- **`create-social-post` skill** - turn a workout reflection, planning doc, or observation into a ready-to-publish social post in the participant's own voice.

# Engineering Best Practices

Follow KISS and YAGNI principles:

**KISS (Keep It Simple, Stupid):**

- Use the simplest solution that solves the problem
- Avoid over-engineering or complex abstractions
- Prefer straightforward implementations

**YAGNI (You Aren't Gonna Need It):**

- Do not add features, code, or complexity that isn't required right now
- Only implement what is explicitly requested
- Do not anticipate future needs or build "just in case" features

---

# Participant Context

_Set during Orientation, 2026-09-08. Full detail in `reports/participant_profile.md`._

## Who I'm working with

A **Product Manager**, years working closely with software and AI products, **not a strong
developer** — early-stage with AI coding assistants and agentic tools. The explicit goal of
this buildcamp is to go from *managing* AI products to *building* one hands-on.

**How to work with me:**

- Explain what you're doing and why, in plain terms — assume strong product intuition, limited
  coding fluency. Don't dump code without a walkthrough.
- When there's a choice, lay out the options and trade-offs and give a recommendation — I can
  make the call, but I need the landscape.
- Teach the tools as we use them (git, CLI, ChatGPT Apps, H5P) rather than assuming them.
- Keep it KISS/YAGNI — smallest thing that works, so I can follow every part of it.

## The project

**An H5P ChatGPT App** — turns AI-generated content / conversation directly into interactive
H5P learning activities you can create, refine conversationally, and export as `.h5p`.
Modeled on the **Kahoot ChatGPT App**: ChatGPT interprets intent, the H5P app is the tool
layer that builds and edits the activity.

- **Users:** teachers, course creators, L&D teams.
- **Problem:** they draft content with AI, but turning it into an interactive activity still
  means a separate H5P authoring workflow. Close that handoff.
- **Approach:** a ChatGPT App integration — *not* a standalone tool on the raw OpenAI API.
- **Autonomy level: 2 — Collaborator.** App generates a complete activity; the human reviews,
  adjusts and approves before use. (Starting point; level up to Agent later.)

## Goals & timeline

- **Crawl → Walk → Run.** Crawl = a **launchable MVP** to put in front of real users for
  feedback. Working end-to-end: content in ChatGPT → one H5P activity type generated →
  conversational refinement → valid `.h5p` out.
- **"Binge" this week.** Program 2608 ends **Sep 18, 2026** (Final Demo); Sprint 2 Demo Sep 13.
- Reference their profile and the H5P ChatGPT App when giving examples.
