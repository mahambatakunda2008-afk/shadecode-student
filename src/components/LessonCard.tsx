interface LessonCardProps {
  lesson: {
    id: string;
    title: string;
    type: string;
    xp: number;
    subject: string;
    createdAt: string;
  };
  onClick: () => void;
}

export default function LessonCard({ lesson, onClick }: LessonCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-800 p-4 rounded-lg hover:scale-105 transform transition cursor-pointer"
    >
      <div className="font-semibold text-lg">{lesson.title}</div>
      <div className="text-sm text-gray-400">{lesson.subject} • {lesson.type}</div>
      <div className="mt-2 text-green-400">+{lesson.xp} XP</div>
    </div>
  );
}
