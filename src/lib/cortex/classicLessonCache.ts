export function matchesCachedClassicLesson(
  requestedSubject: string,
  requestedTopic: string,
  lessonSubject: string,
  lessonTopic: string,
  lessonTitle: string,
): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const subject = normalize(requestedSubject);
  const topic = normalize(requestedTopic);
  const savedSubject = normalize(lessonSubject);
  const savedTopic = normalize(lessonTopic);
  const savedTitle = normalize(lessonTitle);
  if (!subject || !topic || savedSubject !== subject || !savedTitle) return false;
  return savedTopic === topic ||
    (savedTopic.length >= 8 && topic.length >= 8 && (savedTopic.includes(topic) || topic.includes(savedTopic))) ||
    (topic.length >= 12 && savedTitle.includes(topic));
}
