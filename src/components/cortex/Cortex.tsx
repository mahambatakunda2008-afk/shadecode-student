"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearQueuedCortexEvents,
  getQueuedCortexEvents,
  subscribeToCortexEvents,
} from "@/lib/cortex/events/queue";
import {
  buildCortexFingerprint,
  resolveCortexExtension,
} from "@/lib/cortex/runtime/engine";
import {
  createCortexCacheKey,
  getCachedCortexInsight,
  setCachedCortexInsight,
} from "@/lib/cortex/runtime/cache";
import { CortexEvent, CortexSnapshot } from "@/lib/cortex/types";
import CurriculumProgressCard from '@/components/CurriculumProgressCard';
import LearningJourney from '@/components/LearningJourney';

interface CortexProps {
  userId: string;
  trigger: number;
}

interface Insight {
  id: string;
  insight: string;
  created_at: string;
  isNew?: boolean;
}

interface TaskRecord {
  id: string;
  title: string;
  completed: boolean;
}

interface SubjectRecord {
  name: string;
}

export default function Cortex({ userId, trigger }: CortexProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [processing, setProcessing] = useState(false);
  const [supabase] = useState(() => createClient());
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishProcessing = useEffectEvent(() => {
    setTimeout(() => setProcessing(false), 300);
  });

  const addInsightToState = useEffectEvent((saved: Insight) => {
    setInsights((previous) => {
      const nextInsight = { ...saved, isNew: true };
      const nextList = [nextInsight, ...previous].slice(0, 4);

      window.setTimeout(() => {
        setInsights((current) =>
          current.map((insight) =>
            insight.id === saved.id ? { ...insight, isNew: false } : insight
          )
        );
      }, 600);

      return nextList;
    });
  });

  const loadSnapshot = useEffectEvent(async (): Promise<CortexSnapshot | null> => {
    const [{ data: tasks }, { data: profile }, { data: subjects }, curriculumResponse] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, completed")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("profiles").select("streak, level, xp").eq("id", userId).single(),
      supabase.from("subjects").select("name").eq("user_id", userId),
      fetch("/api/curriculum").then((response) => response.json()).catch(() => null),
    ]);

    if (!tasks || !profile) {
      return null;
    }

    const typedTasks = tasks as TaskRecord[];
    const typedSubjects = (subjects ?? []) as SubjectRecord[];
    const completedTasks = typedTasks.filter((task) => task.completed);

    const curriculumState = curriculumResponse?.state ?? null;

    return {
      streak: Number(profile.streak ?? 0),
      level: Number(profile.level ?? 1),
      xp: Number(profile.xp ?? 0),
      totalTasks: typedTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: typedTasks.length - completedTasks.length,
      subjects: typedSubjects.map((subject) => subject.name),
      recentTaskTitles: typedTasks.slice(0, 5).map((task) => task.title),
      curriculumCompletionPercent: curriculumState?.completionPercent,
      currentLesson: curriculumState?.currentLesson
        ? { id: curriculumState.currentLesson.id, title: curriculumState.currentLesson.title }
        : null,
      recommendedNextLesson: curriculumState?.recommendedNextLesson
        ? { id: curriculumState.recommendedNextLesson.id, title: curriculumState.recommendedNextLesson.title }
        : null,
      completedLessonCount: curriculumState?.completedLessons?.length,
      lockedLessonCount: curriculumState?.lockedLessons?.length,
      totalProjects: curriculumState?.totalProjects,
      activeProjectCount: curriculumState?.activeProjectCount,
      completedProjectCount: curriculumState?.completedProjectCount,
      recommendedProject: curriculumState?.recommendedProject,
    };
  });

  const persistInsight = useEffectEvent(
    async (insight: string, fingerprint: string, processedEvents: CortexEvent[]) => {
      const cacheKey = createCortexCacheKey(userId, fingerprint);

      if (insights[0]?.insight === insight) {
        setCachedCortexInsight(cacheKey, insight);
        clearQueuedCortexEvents(
          userId,
          processedEvents.map((event) => event.id)
        );
        return true;
      }

      const { data: saved, error } = await supabase
        .from("cortex_insights")
        .insert({ user_id: userId, insight })
        .select()
        .single();

      if (error || !saved) {
        console.error("Cortex insight save error:", error);
        return false;
      }

      setCachedCortexInsight(cacheKey, insight);
      clearQueuedCortexEvents(
        userId,
        processedEvents.map((event) => event.id)
      );
      addInsightToState(saved as Insight);
      return true;
    }
  );

  const runAnalysis = useEffectEvent(async () => {
    if (!userId || processing) {
      return;
    }

    setProcessing(true);
    const queuedEvents = getQueuedCortexEvents(userId);

    try {
      const snapshot = await loadSnapshot();
      if (!snapshot) {
        finishProcessing();
        return;
      }

      const fingerprint = buildCortexFingerprint(snapshot, queuedEvents);
      const cacheKey = createCortexCacheKey(userId, fingerprint);
      const cachedInsight = getCachedCortexInsight(cacheKey);

      if (cachedInsight) {
        clearQueuedCortexEvents(
          userId,
          queuedEvents.map((event) => event.id)
        );
        return;
      }

      const extensionInsight = resolveCortexExtension({
        events: queuedEvents,
        snapshot,
      });

      if (extensionInsight) {
        await persistInsight(extensionInsight, fingerprint, queuedEvents);
        return;
      }

      const response = await fetch("/api/cortex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "behavior.insight",
          payload: {
            userId,
            events: queuedEvents,
            snapshot,
            fingerprint,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Cortex API failed with status ${response.status}`);
      }

      const data = await response.json();
      const remoteInsight = data.insight?.trim();

      if (remoteInsight) {
        await persistInsight(remoteInsight, fingerprint, queuedEvents);
      }
    } catch (error) {
      console.error("Cortex error:", error);
    } finally {
      finishProcessing();
    }
  });

  const scheduleAnalysis = useEffectEvent((delay = 350) => {
    if (!userId) {
      return;
    }

    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
    }

    analysisTimerRef.current = setTimeout(() => {
      void runAnalysis();
    }, delay);
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    const loadInsights = async () => {
      const { data } = await supabase
        .from("cortex_insights")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4);

      if (data) {
        setInsights(data as Insight[]);
      }
    };

    void loadInsights();
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe = subscribeToCortexEvents((event) => {
      if (event.userId === userId) {
        scheduleAnalysis(250);
      }
    });

    return () => {
      unsubscribe();
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
    };
  }, [userId]);

  useEffect(() => {
    if (trigger === 0 || !userId) {
      return;
    }

    scheduleAnalysis(600);
  }, [trigger, userId]);

  return (
    <>
      <style>{`
        @keyframes cortexFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cortexPulse {
          0%, 100% { opacity: 0.03; }
          50% { opacity: 0.07; }
        }

        @keyframes cortexSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .cortex-insight {
          animation: cortexFadeIn 0.4s ease forwards;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.12);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 2px;
        }

        .cortex-sidebar {
          display: none;
        }

        .cortex-card {
          display: block;
        }

        @media (min-width: 900px) {
          .cortex-sidebar {
            display: flex;
          }

          .cortex-card {
            display: none;
          }
        }
      `}</style>

      <div
        className="cortex-sidebar"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "280px",
          height: "100vh",
          flexDirection: "column",
          gap: "0",
          zIndex: 40,
          background: "rgba(8, 8, 14, 0.85)",
          backdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(99, 102, 241, 0.1)",
          padding: "32px 20px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
            animation: "cortexPulse 15s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        <div style={{ marginBottom: "24px", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <p
              style={{
                fontWeight: 800,
                fontSize: "14px",
                color: "var(--primary)",
                letterSpacing: "2px",
              }}
            >
              CORTEX
            </p>
            {processing && (
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "2px solid var(--primary)",
                  borderTopColor: "transparent",
                  marginLeft: "auto",
                  animation: "cortexSpin 0.8s linear infinite",
                }}
              />
            )}
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "var(--muted-foreground)",
              letterSpacing: "1px",
            }}
          >
            Learning interpretation layer
          </p>
          <div
            style={{
              height: "1px",
              background: "linear-gradient(to right, rgba(99, 102, 241, 0.3), transparent)",
              marginTop: "12px",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            position: "relative",
          }}
        >
          {insights.length === 0 ? (
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted-foreground)",
                fontStyle: "italic",
                lineHeight: 1.6,
                opacity: 0.6,
              }}
            >
              {processing ? "Analyzing..." : "Idle - awaiting learning signals"}
            </p>
          ) : (
            insights.map((insight, index) => (
              <div
                key={insight.id}
                className="cortex-insight"
                style={{
                  background: "rgba(99, 102, 241, 0.04)",
                  border: "1px solid rgba(99, 102, 241, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  opacity: index === 0 ? 1 : Math.max(0.3, 1 - index * 0.2),
                  transition: "opacity 0.5s ease",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.6,
                    color:
                      index === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {insight.insight}
                </p>
              </div>
            ))
          )}

          {/* Curriculum card in sidebar */}
          <div style={{ marginTop: 12 }}>
            <CurriculumProgressCard />
          </div>
        </div>

        {processing && (
          <p
            style={{
              position: "absolute",
              bottom: "24px",
              fontSize: "11px",
              color: "var(--primary)",
              opacity: 0.6,
              letterSpacing: "1px",
            }}
          >
            Analyzing...
          </p>
        )}
      </div>

      <div
        className="cortex-card"
        style={{
          background: "rgba(10, 10, 15, 0.8)",
          border: "1px solid rgba(99, 102, 241, 0.15)",
          borderRadius: "12px",
          padding: "16px",
          backdropFilter: "blur(10px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 70%)",
            animation: "cortexPulse 15s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
            position: "relative",
          }}
        >
          <p
            style={{
              fontWeight: 800,
              fontSize: "13px",
              color: "var(--primary)",
              letterSpacing: "2px",
            }}
          >
            CORTEX
          </p>
          {processing && (
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border: "2px solid var(--primary)",
                borderTopColor: "transparent",
                marginLeft: "auto",
                animation: "cortexSpin 0.8s linear infinite",
              }}
            />
          )}
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "var(--muted-foreground)",
            letterSpacing: "1px",
            marginBottom: "12px",
            position: "relative",
          }}
        >
          Learning interpretation layer
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            position: "relative",
          }}
        >
          {insights.length === 0 ? (
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted-foreground)",
                fontStyle: "italic",
              }}
            >
              {processing ? "Analyzing..." : "Idle - awaiting learning signals"}
            </p>
          ) : (
            insights.map((insight, index) => (
              <div
                key={insight.id}
                className="cortex-insight"
                style={{
                  background: "rgba(99, 102, 241, 0.05)",
                  border: "1px solid rgba(99, 102, 241, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  opacity: index === 0 ? 1 : Math.max(0.3, 1 - index * 0.2),
                  transition: "opacity 0.5s ease",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.5,
                    color:
                      index === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {insight.insight}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Compact learning journey for card view */}
        <div style={{ marginTop: 12 }} className="hidden md:block">
          <LearningJourney />
        </div>
      </div>
    </>
  );
}
