# Interactify Beta — OpenAI plugin package

This directory is the portable plugin package referenced by OpenAI's submission portal —
not something the Next.js app builds or serves. The app itself only needs to keep running
at the URL `mcp.json` points to; nothing here is deployed.

## Structure

- `plugin.json` — the manifest (name, description, OpenAI-specific display fields: icon,
  category, privacy policy link, etc.)
- `mcp.json` — points at the already-deployed, already-live MCP server
  (`https://project2608b.vercel.app/api/mcp`) — this package does *not* bundle a server,
  it references the remote one
- `skills/` — optional, cross-cutting guidance the model can draw on across all 9 content
  types (not tool-specific mechanics, which stay in each tool's own description in
  `app/api/[transport]/route.ts`):
  - `choosing-the-right-h5p-content-type/` — which of the 9 types fits a given learning
    goal, before any tool is called
  - `learning-design-for-interactives/` — checkpoint placement, distractor quality,
    feedback, once a content type is already chosen
  - `accessible-interactive-design/` — wording and answer-matching choices that affect
    screen reader users, language learners, and cognitive accessibility
- `assets/icon.png` — same icon as `app/icon.svg`, rasterized for the manifest

## To submit

Zip the *contents* of this directory (so `plugin.json` sits at the zip's root, not inside
an `openai-plugin/` folder) and upload it through the submission portal at
platform.openai.com/plugins. See the submission package artifact for the full process and
the content that goes in the review form itself (test cases, release notes, reviewer
access) - this directory only covers the manifest/package half of submission.

## Keeping this in sync

If the app name, description, icon, or privacy policy URL changes, update both this
package and the corresponding submission artifacts - they're currently duplicated content,
not generated from a single source.
