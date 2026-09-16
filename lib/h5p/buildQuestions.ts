import { randomUUID } from "node:crypto";
import { escapeHtml, multiChoiceQuestion, CONFIRM_CHECK, CONFIRM_RETRY } from "./buildQuiz";
import type { CheckpointQuestion, TrueFalseCheckpoint } from "./checkpointSpec";

/**
 * Builds the H5P content block for a single embeddable checkpoint question
 * (Multiple Choice or True/False), for use inside a Book chapter (H5P.Column)
 * or a Video timeline interaction (H5P.InteractiveVideo).
 */

const TRUEFALSE_L10N = {
  trueText: "True",
  falseText: "False",
  score: "You got @score of @total points",
  checkAnswer: "Check",
  showSolutionButton: "Show solution",
  tryAgain: "Retry",
  wrongAnswerMessage: "Wrong answer",
  correctAnswerMessage: "Correct answer",
  scoreBarLabel: "You got :num out of :total points",
  submitAnswer: "Submit",
};

export function trueFalseQuestion(cp: TrueFalseCheckpoint) {
  return {
    library: "H5P.TrueFalse 1.8",
    subContentId: randomUUID(),
    metadata: { contentType: "True/False Question", license: "U", title: cp.statement.slice(0, 60) },
    params: {
      question: `<p>${escapeHtml(cp.statement)}</p>\n`,
      correct: cp.correct ? "true" : "false",
      media: { disableImageZooming: false },
      behaviour: {
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true,
        confirmCheckDialog: false,
        confirmRetryDialog: false,
        autoCheck: false,
      },
      l10n: TRUEFALSE_L10N,
      confirmCheck: CONFIRM_CHECK,
      confirmRetry: CONFIRM_RETRY,
    },
  };
}

export function checkpointContentBlock(cp: CheckpointQuestion) {
  return cp.type === "truefalse" ? trueFalseQuestion(cp) : multiChoiceQuestion(cp);
}
