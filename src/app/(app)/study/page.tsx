"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Timer,
  Flame,
  Zap,
  BookOpen,
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  Coffee,
  Activity,
  Target,
} from "lucide-react";

/* =========================
   TYPES
========================= */

type Difficulty = "easy" | "normal" | "hard";

interface StudySession {
  subject: string;
  startTime: number;
  focusScore: number;
  mistakes: number;
  completedTasks: number;
  difficulty: Difficulty;
  paused: boolean;
}

/* =========================
   SUBJECTS
========================= */

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "English",
  "Computer Science",
];

/* =========================
   HELPERS
========================= */

function getDifficultyColor(difficulty: Difficulty) {
  switch (difficulty) {
    case "easy":
      return "#22c55e";

    case "hard":
      return "var(--danger)";

    default:
      return "#6366f1";
  }
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    hrs > 0 ? String(hrs).padStart(2, "0") : null,
    String(mins).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
}

/* =========================
   CORTEX ENGINE
========================= */

function cortexAnalyze(session: StudySession) {
  const duration =
    (Date.now() - session.startTime) / 60000;

  /* FATIGUE */

  if (
    duration > 45 ||
    session.focusScore < 25
  ) {
    return {
      state: "fatigue",
      difficulty: "easy" as Difficulty,
      message:
        "Cognitive fatigue rising. Recovery mode activated.",
      recommendation:
        "Short reset break recommended.",
    };
  }

  /* FLOW STATE */

  if (
    session.focusScore > 85 &&
    session.mistakes <= 1
  ) {
    return {
      state: "flow",
      difficulty: "hard" as Difficulty,
      message:
        "Flow state detected. Cortex increasing challenge intensity.",
      recommendation:
        "Advanced problems unlocked.",
    };
  }

  /* UNSTABLE */

  if (session.mistakes >= 5) {
    return {
      state: "unstable",
      difficulty: "easy" as Difficulty,
      message:
        "Error frequency elevated. Cortex reducing complexity.",
      recommendation:
        "Reinforce fundamentals before escalation.",
    };
  }

  /* STABLE */

  return {
    state: "stable",
    difficulty: "normal" as Difficulty,
    message:
      "Stable learning rhythm maintained.",
    recommendation:
      "Continue steady progression.",
  };
}

/* =========================
   COMPONENT
========================= */

export default function StudyPage() {
  /* =========================
     STATE
  ========================= */

  const [session, setSession] =
    useState<StudySession>({
      subject: "Mathematics",
      startTime: Date.now(),
      focusScore: 70,
      mistakes: 0,
      completedTasks: 0,
      difficulty: "normal",
      paused: false,
    });

  const [seconds, setSeconds] = useState(0);

  const [xp, setXp] = useState(0);

  const [streak, setStreak] = useState(1);

  const [heartbeat, setHeartbeat] =
    useState("Cortex online.");

  const [pulse, setPulse] = useState(false);

  const idleRef = useRef<NodeJS.Timeout | null>(
    null
  );

  /* =========================
     TIMER
  ========================= */

  useEffect(() => {
    const interval = setInterval(() => {
      if (!session.paused) {
        setSeconds((s) => s + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.paused]);

  /* =========================
     CORTEX HEARTBEAT
  ========================= */

  useEffect(() => {
    const interval = setInterval(() => {
      const analysis =
        cortexAnalyze(session);

      setHeartbeat(analysis.message);

      setSession((prev) => ({
        ...prev,
        difficulty: analysis.difficulty,
      }));

      setPulse(true);

      setTimeout(() => setPulse(false), 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [session]);

  /* =========================
     IDLE DETECTION
  ========================= */

  useEffect(() => {
    const resetIdle = () => {
      if (idleRef.current)
        clearTimeout(idleRef.current);

      idleRef.current = setTimeout(() => {
        setSession((prev) => ({
          ...prev,
          focusScore: Math.max(
            0,
            prev.focusScore - 10
          ),
        }));
      }, 30000);
    };

    window.addEventListener(
      "mousemove",
      resetIdle
    );

    window.addEventListener(
      "keydown",
      resetIdle
    );

    resetIdle();

    return () => {
      window.removeEventListener(
        "mousemove",
        resetIdle
      );

      window.removeEventListener(
        "keydown",
        resetIdle
      );
    };
  }, []);

  /* =========================
     ACTIONS
  ========================= */

  const completeTask = () => {
    setSession((prev) => ({
      ...prev,
      completedTasks:
        prev.completedTasks + 1,
      focusScore: Math.min(
        100,
        prev.focusScore + 6
      ),
    }));

    setXp((x) => x + 40);

    if (
      session.completedTasks > 0 &&
      session.completedTasks % 5 === 0
    ) {
      setStreak((s) => s + 1);
    }
  };

  const failTask = () => {
    setSession((prev) => ({
      ...prev,
      mistakes: prev.mistakes + 1,
      focusScore: Math.max(
        0,
        prev.focusScore - 8
      ),
    }));
  };

  const togglePause = () => {
    setSession((prev) => ({
      ...prev,
      paused: !prev.paused,
    }));
  };

  const resetSession = () => {
    setSession({
      subject: session.subject,
      startTime: Date.now(),
      focusScore: 70,
      mistakes: 0,
      completedTasks: 0,
      difficulty: "normal",
      paused: false,
    });

    setSeconds(0);
    setXp(0);
  };

  /* =========================
     ANALYSIS
  ========================= */

  const analysis = useMemo(() => {
    return cortexAnalyze(session);
  }, [session]);

  /* =========================
     UI
  ========================= */

  return (
    <div
      style={{
        padding: "32px 20px 24px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--primary)",
            marginBottom: "8px",
          }}
        >
          Cortex OS
        </p>

        <h1
          style={{
            fontSize: "30px",
            fontWeight: 800,
            margin: 0,
          }}
        >
          Live Study Session
        </h1>

        <p
          style={{
            color: "var(--muted-foreground)",
            marginTop: "8px",
            lineHeight: 1.6,
          }}
        >
          Real-time adaptive learning engine.
        </p>
      </div>

      {/* TOP GRID */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "22px",
        }}
      >
        {/* TIMER */}

        <div
          style={{
            background: "var(--card)",
            border:
              "1px solid var(--card-border)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Timer size={18} />
            <span
              style={{
                fontWeight: 700,
              }}
            >
              Session Time
            </span>
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
            }}
          >
            {formatDuration(seconds)}
          </div>
        </div>

        {/* FOCUS */}

        <div
          style={{
            background: "var(--card)",
            border:
              "1px solid var(--card-border)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Brain size={18} />
            <span
              style={{
                fontWeight: 700,
              }}
            >
              Focus Level
            </span>
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
            }}
          >
            {session.focusScore}%
          </div>

          <div
            style={{
              marginTop: "14px",
              height: "10px",
              borderRadius: "999px",
              overflow: "hidden",
              background:
                "var(--card-border)",
            }}
          >
            <div
              style={{
                width: `${session.focusScore}%`,
                height: "100%",
                background:
                  session.focusScore > 75
                    ? "#22c55e"
                    : session.focusScore > 40
                    ? "#f59e0b"
                    : "var(--danger)",
                transition: "0.3s",
              }}
            />
          </div>
        </div>

        {/* DIFFICULTY */}

        <div
          style={{
            background: "var(--card)",
            border:
              "1px solid var(--card-border)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Target size={18} />
            <span
              style={{
                fontWeight: 700,
              }}
            >
              Difficulty
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "999px",
              background: `${getDifficultyColor(
                session.difficulty
              )}22`,
              border: `1px solid ${getDifficultyColor(
                session.difficulty
              )}55`,
              color: getDifficultyColor(
                session.difficulty
              ),
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {session.difficulty}
          </div>
        </div>

        {/* XP */}

        <div
          style={{
            background: "var(--card)",
            border:
              "1px solid var(--card-border)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Zap size={18} />
            <span
              style={{
                fontWeight: 700,
              }}
            >
              Session XP
            </span>
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
            }}
          >
            {xp}
          </div>
        </div>
      </div>

      {/* CORTEX PANEL */}

      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.03))",
          border:
            "1px solid rgba(99,102,241,0.2)",
          borderRadius: "24px",
          padding: "24px",
          marginBottom: "22px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* PULSE */}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, rgba(99,102,241,0.18), transparent 70%)",
            opacity: pulse ? 1 : 0.3,
            transition: "0.5s",
          }}
        />

        <div
          style={{
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <Activity
              size={20}
              color="var(--primary)"
            />

            <span
              style={{
                fontWeight: 800,
                fontSize: "14px",
              }}
            >
              Cortex Live Feed
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              lineHeight: 1.5,
              fontWeight: 800,
            }}
          >
            {heartbeat}
          </h2>

          <p
            style={{
              marginTop: "12px",
              color: "var(--muted-foreground)",
              lineHeight: 1.6,
            }}
          >
            {analysis.recommendation}
          </p>
        </div>
      </div>

      {/* CONTROLS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "22px",
        }}
      >
        {/* SUBJECT */}

        <div
          style={{
            background: "var(--card)",
            border:
              "1px solid var(--card-border)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <BookOpen size={18} />

            <span
              style={{
                fontWeight: 700,
              }}
            >
              Subject
            </span>
          </div>

          <select
            value={session.subject}
            onChange={(e) =>
              setSession((prev) => ({
                ...prev,
                subject: e.target.value,
              }))
            }
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border:
                "1px solid var(--card-border)",
              background: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            {SUBJECTS.map((s) => (
              <option key={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* ACTIONS */}

        <div
          style={{
            background: "var(--card)",
            border:
              "1px solid var(--card-border)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={completeTask}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "#22c55e",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <CheckCircle2
                size={16}
                style={{
                  marginRight: "6px",
                }}
              />
              Complete
            </button>

            <button
              onClick={failTask}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "var(--danger)",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <XCircle
                size={16}
                style={{
                  marginRight: "6px",
                }}
              />
              Mistake
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <button
              onClick={togglePause}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border:
                  "1px solid var(--card-border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {session.paused ? (
                <>
                  <Play size={16} /> Resume
                </>
              ) : (
                <>
                  <Pause size={16} /> Pause
                </>
              )}
            </button>

            <button
              onClick={resetSession}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border:
                  "1px solid var(--card-border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Coffee
                size={16}
                style={{
                  marginRight: "6px",
                }}
              />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}

      <div
        style={{
          background: "var(--card)",
          border:
            "1px solid var(--card-border)",
          borderRadius: "24px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "18px",
            fontSize: "20px",
            fontWeight: 800,
          }}
        >
          Session Metrics
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <MetricCard
            label="Completed Tasks"
            value={session.completedTasks}
            icon={<CheckCircle2 size={18} />}
          />

          <MetricCard
            label="Mistakes"
            value={session.mistakes}
            icon={<XCircle size={18} />}
          />

          <MetricCard
            label="Study Streak"
            value={`${streak}d`}
            icon={<Flame size={18} />}
          />

          <MetricCard
            label="Subject"
            value={session.subject}
            icon={<BookOpen size={18} />}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================
   METRIC CARD
========================= */

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: any;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          "var(--card-border)",
        border:
          "1px solid var(--card-border)",
        borderRadius: "18px",
        padding: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          opacity: 0.7,
          marginBottom: "10px",
          fontSize: "13px",
        }}
      >
        {icon}
        {label}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  );
}
