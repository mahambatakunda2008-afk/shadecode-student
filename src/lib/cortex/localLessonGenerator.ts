import { buildOfflineLesson, buildOfflineLessonWithPack, type OfflineLesson, type OfflineLessonBlock } from "@/lib/cortex/offlineLessonEngine";
import { readOfflineCurriculumPack } from "@/lib/cortex/offlineCurriculumPack";

export type LocalLessonBlock = OfflineLessonBlock;
export type LocalLesson = OfflineLesson;

function extractTopic(prompt: string) {
  return prompt.trim()
    .replace(/^\s*(?:please\s+)?(?:teach|explain|show|walk me through|help me learn|help me understand|help me with|go through|cover|learn)\s+(?:me\s+)?/i, "")
    .replace(/^\s*(?:revise|revision|review|recap|summarise|summarize)\s+(?:me\s+)?/i, "")
    .trim();
}

export function generateLocalLesson(subject: string, prompt: string, curriculumContext = ""): LocalLesson {
  const topic = extractTopic(prompt);
  const pack = readOfflineCurriculumPack(subject);
  return buildOfflineLessonWithPack(subject, prompt, topic, pack) ?? buildOfflineLesson(subject, prompt, curriculumContext) ?? {
    id: `offline-unavailable-${Date.now().toString(36)}`,
    title: `${topic || prompt.trim()}: offline curriculum unavailable`,
    blocks: [
      { type: "objective", title: "Curriculum data required", content: "- No verified curriculum knowledge pack containing this topic is cached on this device." },
      { type: "concept", title: "Offline boundary", content: "Cortex will not invent syllabus content when authoritative curriculum knowledge is unavailable." },
      { type: "checkpoint", title: "Reconnect", content: "Question: Can this learner cache the verified curriculum for this subject and level?\nThink: Offline teaching starts from authoritative data." },
      { type: "summary", title: "Status", content: "No lesson was fabricated. Cache the curriculum while online, then retry." },
    ],
  };
}

export function hasLocalLessonFallback(subject: string, prompt: string, curriculumContext = "") {
  const topic = extractTopic(prompt);
  const pack = readOfflineCurriculumPack(subject);
  return Boolean((pack && buildOfflineLessonWithPack(subject, prompt, topic, pack)) || buildOfflineLesson(subject, prompt, curriculumContext));
}
