import type { TutoringMessage } from "./types";

/**
 * Return the latest real student contribution for attempt analysis.
 * Help controls remain in the conversation for context, but are not evidence
 * of the student's reasoning.
 */
export function getLastStudentAttempt(
  conversation: TutoringMessage[],
): TutoringMessage | undefined {
  return conversation
    .filter((message) => message.role === "student" && !message.metadata?.helpAction)
    .pop();
}
