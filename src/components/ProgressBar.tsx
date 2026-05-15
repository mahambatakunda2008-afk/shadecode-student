interface ProgressBarProps {
  value: number;
  max: number;
}

export default function ProgressBar({ value, max }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-700 rounded h-3 overflow-hidden">
      <div
        className="bg-purple-600 h-3 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
