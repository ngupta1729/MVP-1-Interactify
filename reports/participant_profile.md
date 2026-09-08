# Participant Profile

_Created: 2026-09-08 · Updated: 2026-09-08 · Source: Orientation workout_

## Background

A Product Manager who has spent years working closely with software and AI products.
Comfortable with product strategy and working alongside engineering and AI teams, but not a
strong developer. Has recently started experimenting with AI coding assistants and agentic
tools and wants the buildcamp to push them from *managing* AI products to *building* them
hands-on. Broader interest: improving quality of life through productivity savings with AI,
and making products/prototypes that weren't previously possible. Timezone: Europe/Berlin.

## Experience

- **Product:** years shipping software and AI products as a PM.
- **AI/LLMs:** works with AI products day-to-day; strong product-level understanding.
- **Coding:** early-stage. Has begun using AI coding assistants and agentic tools; limited
  traditional software development background.
- **Wants to add:** AI coding / agentic workflows, ChatGPT App development, the H5P framework
  incl. `.h5p` packaging and integration.

## Motivation

1. **Personal capability** — become genuinely hands-on at building AI products, not just
   directing them.
2. **The product bet** — prove a prototype that removes the separate H5P authoring step for
   educators and L&D teams.

## Goals & rhythm

- **Approach:** Crawl → Walk → Run. The **Crawl = a launchable MVP** — get it into the
  market and gather initial feedback, then iterate.
- **This week:** "binge" to reach the working MVP. No fixed weekly plan.
- **Program:** 2608 (4-week). Sprint 2 Demo Sep 13 · Final Demo **Sep 18, 2026**.
- **Check-ins:** open to lightweight daily check-ins during the binge (wind-down standups
  Sep 14–17).

## Project idea

**An H5P ChatGPT App** that turns AI-generated content and conversation directly into
interactive H5P learning activities — create them, refine them conversationally, and export
usable H5P content.

Concept, modeled on the **Kahoot ChatGPT App**: ChatGPT supplies the AI and interprets user
intent; the H5P app supplies the tools to create and modify interactive H5P content.
Example: user says *"Turn these lecture notes into an interactive activity"* → app generates
an H5P activity → user refines it conversationally → produces a usable `.h5p` file.

**Approach:** build as a ChatGPT App integration (not a standalone tool on the raw OpenAI
API); expose H5P authoring capabilities as the tool layer ChatGPT calls.

### Problem space

Teachers, course creators, and L&D teams already use AI to draft learning content, but
converting that content into an engaging interactive activity still requires a separate H5P
authoring workflow. The unmet need is the handoff: going directly from AI-generated
content/conversation in ChatGPT to a finished, refinable interactive H5P activity.

### Success criteria

Working end-to-end prototype: give ChatGPT learning content → H5P app creates an interactive
activity → refine it conversationally → produce usable H5P content. **Stretch:** test with a
few real users (teachers / course creators / L&D) to check it solves a meaningful problem.

### Starting autonomy level

**Level 2 — AI as Collaborator** (in their words: *"Collaborator"*). The app generates a
complete H5P activity from the user's content; the human (teacher / course creator) reviews,
adjusts and approves it — refining conversationally — before using it. The human stays the
gate on every activity.

_This is a **starting point, not a commitment**._ The plan is to level up toward Level 3
(Agent — the app self-checks `.h5p` validity and iterates on its own) once the generation
and validation can be trusted.

## Project status (pre-buildcamp)

- **Maturity:** idea stage — no code yet. Fresh repo `project2608b`. Clear written concept
  and a concrete reference model (Kahoot ChatGPT App).
- **Existing work:** none beyond this concept. (An earlier, unrelated project —
  `project2608a`, an AI predictive-maintenance copilot — has been set aside.)
- **Open challenges:** limited hands-on dev experience; needs to learn ChatGPT App
  development and H5P/`.h5p` integration; needs to validate the workflow is a real pain
  point.
