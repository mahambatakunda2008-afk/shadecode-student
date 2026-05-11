// /lib/cortex/tutor.ts

import { StudySession } from "./session";

export function cortexTutor(session: StudySession) {
  const duration = (Date.now() - session.startTime) / 60000;

  if (duration > 40) {
    return {
      type: "break",
      message: "Take a short break to improve retention.",
    };
  }

  if (session.focusScore > 80) {
    return {
      type: "challenge",
      message: "Increase difficulty — you're in flow state.",
    };
  }

  return {
    type: "continue",
    message: "Keep steady progress.",
  };
}
