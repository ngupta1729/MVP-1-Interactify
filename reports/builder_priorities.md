# Builder Priorities

Running checklist of the builder's own stated worries and priorities. (Feedback from other
people lives in `feedback_checklist.md`.)

## Open

- [ ] Is the "AI content → separate H5P authoring workflow" gap actually painful enough that people would want this? — surfaced 2026-09-08, from the Orientation reflection; needs real-user validation
- [ ] **Once AI can generate a valid, portable `.h5p`, what is the real incentive to choose h5p.com / the vendor's hosted product?** Hosting alone isn't it — the format is open, so the output plays fine in Lumi, Moodle, Canvas, WordPress, any LMS. (The Kahoot analogy breaks: Kahoot's format is proprietary and its host *is* the product, so "come back to save/host" is real lock-in; H5P has none.) Candidate answers to test with users: (a) the *living loop* — a file is dead, a hosted activity keeps being editable/versioned conversationally and pushes updates to the same embed link; (b) *xAPI / analytics* — already h5p.com's paid tier, and AI content volume makes tracking more valuable; (c) a *validity + accessibility guarantee* only the vendor can credibly make; (d) or the capability layer is itself the product — platform-neutral, monetised directly (per-seat / per-generation / enterprise licence). **This is a Stage 1 user-interview question.** Surfaced 2026-09-08 from the Kahoot UX review.
- [~] Feasibility unknowns for the build: can a valid `.h5p` package be generated programmatically, and what does a ChatGPT App integration actually require? — surfaced 2026-09-08. **Mostly answered 2026-09-08:** `.h5p` built from the official H5P Hub bundle, structurally valid (`npm run h5p:smoke`); ChatGPT App = an MCP server (`/api/mcp`) exposing tools + a UI component, ChatGPT is the model. Left to confirm: real import into h5p.com/Lumi, and behaviour inside ChatGPT (needs a paid dev-mode account).
- [ ] Telemetry backup to the buildcamp dashboard is broken (Windows path bug in `shb_telemetry`); credential workaround applied but sync still 409s on a stale multi-project backlog — surfaced 2026-09-08 via `/shb-doctor`, decision pending (archive backlog vs. report to team)

## Resolved
