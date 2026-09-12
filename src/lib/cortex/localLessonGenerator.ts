import { buildOfflineLesson, type OfflineLesson, type OfflineLessonBlock } from "@/lib/cortex/offlineLessonEngine";

export type LocalLessonBlock = OfflineLessonBlock;
export type LocalLesson = OfflineLesson;

export function generateLocalLesson(subject: string, prompt: string, curriculumContext = ""): LocalLesson {
  return buildOfflineLesson(subject, prompt, curriculumContext) ?? {
    id: `offline-unavailable-${Date.now().toString(36)}`,
    title: `${prompt.trim()}: offline curriculum unavailable`,
    blocks: [
      { type: "objective", title: "Curriculum data required", content: "- No verified curriculum knowledge pack containing this topic is cached on this device." },
      { type: "concept", title: "Offline boundary", content: "Cortex will not invent syllabus content when authoritative curriculum knowledge is unavailable." },
      { type: "checkpoint", title: "Reconnect", content: "Question: Can this learner cache the verified curriculum for this subject and level?\nThink: Offline teaching starts from authoritative data." },
      { type: "summary", title: "Status", content: "No lesson was fabricated. Cache the curriculum while online, then retry." },
    ],
  };
}

export function hasLocalLessonFallback(_subject: string, _prompt: string, curriculumContext = "") {
  return curriculumContext.trim().length > 0;
}
