import type { ProfileRecommendation } from "./profile-adaptive";

export type NextActionLink = {
  href: string;
  label: string;
};

export function actionLink(recommendation: ProfileRecommendation): NextActionLink {
  const params = new URLSearchParams();
  if (recommendation.subject) params.set("subject", recommendation.subject);
  if (recommendation.topic) params.set("topic", recommendation.topic);
  params.set("source", "adaptive");

  switch (recommendation.action) {
    case "lesson":
      return { href: `/learn?${params}`, label: "Start targeted lesson" };
    case "workmate":
      return { href: `/workmate?${params}`, label: "Work with Workmate" };
    case "challenge":
      return { href: `/exam-sim?${params}`, label: "Take a challenge" };
    case "practice":
    default:
      return { href: `/practice?${params}`, label: "Start practice" };
  }
}
