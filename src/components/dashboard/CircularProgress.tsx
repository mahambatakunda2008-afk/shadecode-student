export function CircularProgress({
  value,
  max,
  size = 80,
  color = "#6366f1",
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  color?: string;
  label: string;
  sublabel?: string;
}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percent * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth="6" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s ease",
              filter: `drop-shadow(0 0 4px ${color}80)`,
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <p style={{ fontSize: size > 70 ? "18px" : "14px", fontWeight: 800, color, lineHeight: 1 }}>
            {label}
          </p>
        </div>
      </div>
      {sublabel && (
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textAlign: "center" }}>{sublabel}</p>
      )}
    </div>
  );
}
