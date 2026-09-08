# Builder Priorities

Running checklist of the builder's own stated worries and priorities. (Feedback from other
people lives in `feedback_checklist.md`.)

## Open

- [ ] Is the "AI content → separate H5P authoring workflow" gap actually painful enough that people would want this? — surfaced 2026-09-08, from the Orientation reflection; needs real-user validation
- [~] Feasibility unknowns for the build: can a valid `.h5p` package be generated programmatically, and what does a ChatGPT App integration actually require? — surfaced 2026-09-08. **Mostly answered 2026-09-08:** `.h5p` built from the official H5P Hub bundle, structurally valid (`npm run h5p:smoke`); ChatGPT App = an MCP server (`/api/mcp`) exposing tools + a UI component, ChatGPT is the model. Left to confirm: real import into h5p.com/Lumi, and behaviour inside ChatGPT (needs a paid dev-mode account).
- [ ] Telemetry backup to the buildcamp dashboard is broken (Windows path bug in `shb_telemetry`); credential workaround applied but sync still 409s on a stale multi-project backlog — surfaced 2026-09-08 via `/shb-doctor`, decision pending (archive backlog vs. report to team)

## Resolved
