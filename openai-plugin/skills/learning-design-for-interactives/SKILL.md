---
name: learning-design-for-interactives
description: Apply instructional-design judgment whenever building an H5P activity with Interactify - which content type fits the learning goal, where to place checkpoints, how to write questions and distractors that actually test understanding, and when to push back rather than force content into a format that doesn't fit.
---

This applies across all nine Interactify content types (Quiz, Interactive Book, Interactive
Video, Accordion, Dialog Cards, Fill in the Blanks, Drag the Words, Single Choice Set,
Crossword) - it's about the *quality* of what gets built, not the mechanics of any one tool.

## Match the content type to the actual learning goal

Don't default to Quiz because it's the most familiar shape. Pick based on what the learner
is actually meant to do with the content:

- **Recalling terms or definitions** - Dialog Cards or Fill in the Blanks, not a multiple-choice
  quiz. Recognition (picking from options) is a weaker test of recall than production (typing
  or recalling the answer) or active review (flipping a card and checking yourself).
- **Reinforcing vocabulary in context** - Drag the Words (the surrounding sentence gives
  context the word has to fit) or Crossword (the clue forces you to recall from a definition,
  not just recognize a shape).
- **Checking understanding of a full lesson or document** - Interactive Book, with
  checkpoints placed at natural section boundaries, not just at the end.
- **A single YouTube video someone wants to make less passive** - Interactive Video, with
  interactions timed to actual content beats, not evenly spaced by the clock.
- **Browsing structured reference material** (an FAQ, a policy doc, "pick the section that
  applies to you") - Accordion. This one isn't really an assessment at all, and that's fine.
- **A quick formative check with low stakes, one question at a time** - Single Choice Set.
- **A real end-of-unit or summative assessment** - Quiz, since it's the one format with a
  pass mark and an overall score.

If a user's request doesn't cleanly fit any of these, say so rather than silently picking the
closest one - e.g. "this sounds like it wants open-ended written responses, which none of
these formats really support well - want me to build the closest fit, or something else?"

## Where to place checkpoints and interactions

Spacing questions throughout content tests retention better than clustering them at the end
(the testing effect is strongest when retrieval happens close to when the relevant idea was
just introduced, not after unrelated material in between). For Book and Video specifically:

- Place a checkpoint right after the idea it tests, not after several unrelated ideas have
  gone by.
- Don't put one after every single paragraph or every few seconds either - that interrupts
  comprehension before there's anything substantial to check. A natural section or sub-topic
  boundary is usually the right unit.
- If the user hasn't said how often they want checkpoints, ask rather than guessing (Book's
  `checkpointFrequency` field exists for exactly this) - "every section," "a few key spots,"
  and "just a wrap-up at the end" imply different amounts of content to write questions for.

## Writing questions and distractors that actually test something

- Write plausible wrong answers, not throwaway ones. A distractor that's obviously silly
  doesn't test anything - it just makes the question easier by elimination. Good distractors
  reflect a real misunderstanding someone might actually have.
- Avoid "all of the above" / "none of the above" as a crutch - they're usually a sign the
  other options weren't hard to write, and they let someone get the right answer through
  elimination logic instead of knowing the content.
- Avoid negatively-phrased stems ("which of the following is NOT...") unless the negative
  is clearly, visibly marked - they're a common source of avoidable wrong answers that have
  nothing to do with understanding the material.
- Keep answer options parallel in length and structure. A correct answer that's noticeably
  longer or more specific than the distractors is a tell, independent of whether the person
  knows the content.
- Vary the cognitive level across a set of questions where the format allows it (Quiz,
  Single Choice Set) - not everything needs to be pure recall ("what is X called"). Where the
  source content supports it, include at least one question that requires applying or
  reasoning with the idea, not just recognizing a term.

## Feedback

Where a format shows per-answer feedback (Quiz's answer-level feedback, Drag and Drop-style
correct/incorrect text), write feedback that says *why*, not just "Correct!" / "Incorrect."
Generic feedback wastes the one moment the learner is most receptive to understanding their
mistake.

## Keep wording clear

Question stems and card text should be unambiguous on a first read - this matters more here
than in writing generally, because there's no author present to clarify if something's
confusing. Define a term in the stem if the activity is what's introducing it; don't assume
a word the source content itself hasn't explained yet.
