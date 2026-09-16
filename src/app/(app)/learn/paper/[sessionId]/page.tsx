import PaperLearningSession from "./PaperLearningSession";

export default async function PaperLearningSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <PaperLearningSession sessionId={sessionId} />;
}
