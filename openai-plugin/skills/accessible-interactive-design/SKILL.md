---
name: accessible-interactive-design
description: Write content for Interactify's H5P activities so they're usable by people with visual, motor, cognitive, or language-related access needs - not through code changes (H5P's own runtime already handles keyboard navigation and screen reader labeling), but through the actual wording and answer-matching choices made when generating content.
---

H5P's runtime libraries already provide real accessibility infrastructure - keyboard
navigation, ARIA labeling, screen-reader announcements - without any extra effort on your
part. This skill is about the part that infrastructure *can't* fix: the actual words and
answer logic chosen when generating content. Getting that wrong creates a real barrier even
though the underlying player is fully accessible.

## Accept reasonable answer variation, not just one exact phrasing

Requiring a single exact spelling or phrasing is a real access barrier - for dyslexic
learners, English language learners, and anyone using assistive input, not just a
convenience issue.

- **Fill in the Blanks**: use the `/` syntax to accept genuine alternate spellings or
  phrasings for the same blank, e.g. `*colour/color*` or `*labour/labor*`, whenever more
  than one answer is legitimately correct - not just for regional spelling, but for any
  blank where a learner could reasonably phrase the right answer more than one way.
- Don't use this to make genuinely different answers "equivalent" - only phrasings of the
  *same* correct answer.

## Write stems and labels that stand on their own

Someone using a screen reader hears card text and question stems read aloud, often without
the surrounding visual layout for context. Every question, card front, clue, and label
needs to make sense read in isolation:

- Don't write a stem that depends on seeing an image, color, or spatial position ("the one
  on the left," "the green option") - none of these content types in practice rely on
  images for the correct answer, but avoid introducing that dependency in wording even
  incidentally.
- Keep sentences direct. A screen reader user re-parsing a long, clause-heavy stem to find
  the actual question is a real tax that sighted skimming doesn't impose.
- Spell out what an abbreviation means on first use if the activity itself is what
  introduces it - don't assume context the learner doesn't have yet.

## Match reading level to who's actually using this

A teacher building a quiz for their students needs the *students'* reading level reflected
in the questions, not the teacher's. If the source content's audience is implied (a grade
level, "my beginners," a specific course), write at that level - simpler sentence structure
and more common vocabulary isn't dumbing content down, it's removing a barrier that has
nothing to do with whether someone understands the actual subject.

## Be honest about what's outside Interactify's control

**Interactive Video takes a YouTube URL as input - Interactify has no influence over
whether that source video has captions.** If accessibility of the video itself matters to
the person asking (and for an educational use case, it usually does), say so plainly rather
than implying the activity is fully accessible end-to-end: "the questions and interactions
I'm adding are accessible, but captions on the video itself depend on what's available on
YouTube for this specific video - worth checking before using this with students who need
them."

## What you don't need to worry about

H5P.Crossword's own runtime already offers a non-grid input mode (Tab-navigable fields,
styled like Fill in the Blanks) for people who can't or don't want to use the visual grid -
this is a real, already-built feature of the library, not something that needs to be
designed around. Likewise, keyboard operability and screen-reader labeling for every content
type here come from the vendored H5P runtime itself, not from anything in the content you
generate - focus on the wording and answer-matching guidance above, since that's the part
actually within reach.
