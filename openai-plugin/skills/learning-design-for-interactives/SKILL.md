---
name: learning-design-for-interactives
description: Apply instructional-design judgment whenever building an H5P activity with Interactify - where to place checkpoints, how to write questions and distractors that actually test understanding, and how to give feedback that teaches. For which content type to use in the first place, see the choosing-the-right-h5p-content-type skill; for wording accessibility, see accessible-interactive-design.
---

This applies across all nine Interactify content types (Quiz, Interactive Book, Interactive
Video, Accordion, Dialog Cards, Fill in the Blanks, Drag the Words, Single Choice Set,
Crossword) - it's about the *quality* of what gets built, once the content type is already
chosen (see the choosing-the-right-h5p-content-type skill for that earlier decision).

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

Where a format shows per-answer feedback (Quiz's answer-level feedback, Drag the Words'
correct/incorrect text), write feedback that says *why*, not just "Correct!" / "Incorrect."
Generic feedback wastes the one moment the learner is most receptive to understanding their
mistake.

## Wording

Question stems and card text should be unambiguous on a first read - there's no author
present to clarify if something's confusing. See the accessible-interactive-design skill
for how this also matters specifically for screen reader users, language learners, and
cognitive accessibility, not just general clarity.
