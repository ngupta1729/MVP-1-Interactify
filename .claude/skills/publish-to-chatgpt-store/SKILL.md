---
name: publish-to-chatgpt-store
description: Prepares and (with explicit human sign-off) files Interactify's submission to OpenAI's ChatGPT App Directory. Use this whenever the user says they're ready to publish, submit, or list the app on the ChatGPT store/App Directory - phrases like "let's publish this", "submit to the app store", "time to list Interactify", "publish to chatgpt", or "I'm ready to submit". Also use it if the user asks what's still missing before submission, even if they don't explicitly say "run the skill" - checking submission readiness IS this skill's job. Do not use this for general "how do I market this" or roadmap questions unrelated to the actual submission mechanics.
---

# Publish Interactify to the ChatGPT App Directory

This walks through everything OpenAI requires before Interactify can be listed in the
ChatGPT App Directory, in order: re-verify the current rules, fix what the code is
missing, draft the content OpenAI requires, run a real quality/security pass, get the
user's sign-off, and only then optionally file the submission itself.

**The core principle: don't trust anything below as still-true without checking.** This
skill may run weeks or months after it was written. OpenAI's guidelines can change, the
codebase will have changed (new tools, new data collected, fixed bugs), and the actual
submission portal's UI is unknown at authoring time. Every step below says what to
re-verify live rather than assuming last time's answer still holds.

## Step 0 — Re-fetch the current rules

Fetch `https://developers.openai.com/apps-sdk/app-submission-guidelines` fresh (don't
rely on memory of it, yours or the user's). Compare against what this skill assumes
below and flag anything that's changed - especially the required assets list, the
annotation fields, and the prohibited data categories.

## Step 1 — Fix what the code is missing

**Tool annotations.** As of this skill's authoring, none of the three tools registered
in `app/api/[transport]/route.ts` (`create_h5p_quiz`, `create_h5p_book`,
`create_h5p_interactive_video`) declare `readOnlyHint`, `destructiveHint`, or
`openWorldHint` in their `registerTool` call - OpenAI requires these. Don't just copy
values from here; re-read each tool's actual current handler and reason about it fresh,
since behavior may have changed:
- `readOnlyHint` - false for all three today, since each one creates and returns a new
  `.h5p` file; true only if a tool becomes pure retrieval with no output artifact.
- `destructiveHint` - false for all three today; none of them delete or overwrite
  anything that already exists (refinement produces a *new* content-addressed token,
  never mutates the old one). Revisit if that changes.
- `openWorldHint` - false for all three today; each is bounded to generating content
  from what the user/model supplies, not open-ended access to arbitrary external
  systems. (`create_h5p_interactive_video` takes a YouTube URL as *input* rather than
  browsing the open web itself, which is why this stays false rather than true.)

Add these to each tool's config object alongside `title`/`description`/`inputSchema`,
run `npx tsc --noEmit`, and redeploy the same way other route.ts changes have been
deployed this project (`npx vercel deploy --prod --yes`).

**Iframe CSP declaration.** The app already only embeds its own domain (the
`uiResource` block in each tool handler points at `/play/[token]` on this app's own
origin) - which should already satisfy "embed pages from your own registrable domain
only." Re-check the current guidelines' language on `_meta.ui.csp.frameDomains`
specifically for the `uiResource` blocks (separate from the widget's own CSP, which
already declares `frame_domains` for the video widget) and add a declaration there if
the fetched guidelines now require one explicitly.

## Step 2 — Draft the required content artifacts

For each of these, draft real content grounded in the actual current app - don't invent
generic boilerplate:

- **Privacy policy.** Must accurately describe what this app *actually* collects. As of
  authoring: a pseudonymous `anonUid` (derived from `openai/subject`, see
  `lib/db/anon.ts`), click events, and survey responses (happiness/destination/free-text),
  stored in Neon Postgres per `lib/db/schema.ts` and `specs/feedback_loop_spec.md`.
  Re-read those two files fresh before drafting - the schema may have grown. State
  purpose (understanding usage and improving the tool), retention (check if any policy
  exists yet; if not, ask the user what retention period they want, don't invent one),
  and what control users have (currently: none exposed, since this is anonymous/
  pseudonymous by design - say so plainly rather than promising a deletion mechanism
  that doesn't exist).
- **Terms and conditions.** Ask the user whether they have existing terms elsewhere to
  reuse, or want a minimal draft for a free, no-account tool.
- **Support contact.** Ask the user directly what to publish (email or page) - don't
  guess or invent one.
- **App name, short description, long description.** `README.md`'s opening section has
  the current positioning ("H5P AI capability layer... turns learning content into an
  interactive H5P activity, refined by chatting, exported as a standard, portable
  `.h5p` file") - use it as raw material, not verbatim copy, since it may be stale by
  the time this runs (e.g. it's written quiz-first even though Book and Video exist
  too). Draft copy that reflects everything the app *currently* does - check
  `app/api/[transport]/route.ts` for the live list of tools before writing "what it
  does" language, since a new content type may have shipped since this skill was
  written.
- **Icon.** Check `public/` for an existing one first (none existed as of authoring).
  If missing, ask the user for one or offer to help design a simple placeholder - don't
  silently skip this required asset.
- **Screenshots.** These should be real, not mockups. If the `claude-in-chrome` browser
  tools are connected (check with `tabs_context_mcp` first - they were unreliable during
  this skill's authoring session, so don't assume they're working), use them to actually
  open Interactify in ChatGPT, generate one example of each content type live, and
  capture real screenshots of the resulting widget cards. If the browser tools aren't
  available or the app isn't reachable in a live chat, tell the user explicitly rather
  than fabricating a description of what a screenshot would show.

## Step 3 — Quality and security review pass

Before presenting anything as ready, actively check for the things OpenAI's review
would flag (re-verify against the Step 0 fetch, this list may be incomplete by then):
- Do the input schemas (`quizSpecShape`, `bookSpecShape`, `videoSpecShape`) ask for
  anything beyond what's needed to build the activity? They shouldn't request raw
  conversation history, transcripts, or broad profile data - confirm this is still true.
- Do the tool descriptions stay accurate and non-promotional, and avoid steering the
  model to trigger them more broadly than their actual purpose? Re-read the current
  descriptions in `route.ts` with fresh eyes for this.
- Does anything in the data model touch a prohibited category (payment info, health
  data, government IDs, credentials)? It shouldn't, but confirm against the current
  `lib/db/schema.ts` rather than assuming.

Write up what you found as a short punch list - what's compliant, what needed fixing
(and was fixed), what still needs the user's input.

## Step 4 — Human sign-off (required, every time)

Present everything from Steps 1-3 to the user: the code diff for the annotations, the
drafted privacy policy / terms / descriptions / support contact, the screenshots, and
the quality review punch list. Wait for explicit approval or requested changes. Do not
proceed to Step 5 on an assumption that silence means yes - ask.

## Step 5 — Filing the submission (only after Step 4 approval, explicit confirmation before the final submit)

Two things happen outside this skill's control, on the user's own account, before this
step is possible:
- **Identity verification** on the OpenAI Platform Dashboard - tell the user this is
  required and account-level; you cannot do it for them.
- **A working, publicly reachable deployment** - already true (production is live at
  the URL in `README.md`), but re-confirm it's still up before filing.

If the user wants the submission itself filed via browser automation: check
`claude-in-chrome` is connected, navigate to OpenAI's current developer/submission
portal, and fill in the form live using the Step 2 content - the portal's exact layout
is unknown at authoring time, so read the actual page rather than assuming field names
or a fixed flow. Fill in every field you can, but **stop and get the user's explicit
"yes, submit this" before clicking anything that actually files the submission** -
this is a real, consequential, hard-to-reverse action (equivalent to publishing public
content under the user's verified identity), and it must never happen without that
direct confirmation in the moment, no matter how much of the earlier prep was
approved in Step 4.

If the user would rather file it themselves by hand using the prepared content, that's
equally valid - hand them everything drafted in Step 2 in a form they can paste into
the portal, and stop there.
