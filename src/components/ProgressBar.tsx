interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
}

export default function ProgressBar({ value, max, color }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--card-border)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${percent}%`,
          borderRadius: 999,
          background: color ?? "linear-gradient(90deg, #7c3aed, #6366f1)",
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}
