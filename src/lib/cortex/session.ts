// /lib/cortex/session.ts

export interface StudySession {
  subject: string;
  startTime: number;
  focusScore: number;
  mistakes: number;
  completedTasks: number;
  difficulty: "easy" | "normal" | "hard";
}

export function updateSession(session: StudySession, event: string) {
  switch (event) {
    case "task_completed":
      session.focusScore += 5;
      session.completedTasks += 1;
      break;

    case "task_failed":
      session.mistakes += 1;
      session.focusScore -= 5;
      break;

    case "idle":
      session.focusScore -= 10;
      break;
  }

  const duration = (Date.now() - session.startTime) / 60000;

  if (duration > 40 || session.mistakes > 5) {
    session.difficulty = "easy";
  }

  if (session.focusScore > 80) {
    session.difficulty = "hard";
  }

  return session;
}
