"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, RefreshCw } from "lucide-react";
import { listWorkObjects } from "@/lib/studyspace/store";
import { evidenceFromWork, mergeEvidence } from "@/lib/studyspace/evidence";
import { buildLearnerProfile } from "@/lib/studyspace/profile";
import { recommendFromProfile, type ProfileRecommendation } from "@/lib/studyspace/profile-adaptive";
import { actionLink } from "@/lib/studyspace/next-action";

export default function AdaptiveNextMove({ subject }: { subject?: string }) {
  const [recommendation, setRecommendation] = useState<ProfileRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const works = await listWorkObjects();
      const evidence = mergeEvidence(works.map((work) => evidenceFromWork(work)));
      const profile = buildLearnerProfile(evidence);
      setRecommendation(recommendFromProfile(profile, subject));
    } catch {
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [subject]);

  if (loading) {
    return <section aria-label="Adaptive learning" style={{ border: "1px solid var(--card-border)", borderRadius: 14, padding: 16, background: "var(--card)" }}>Reading your work…</section>;
  }

  if (!recommendation) return null;
  const link = actionLink(recommendation);

  return (
    <section aria-labelledby="adaptive-next-move" style={{ border: "1px solid var(--card-border)", borderRadius: 14, padding: 18, background: "var(--card)", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 10, background: "var(--muted)", color: "var(--primary)" }}><BrainCircuit size={19} /></span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary)" }}>Next best move</p>
            <h2 id="adaptive-next-move" style={{ margin: "3px 0 4px", fontSize: 20 }}>{recommendation.topic ? `${recommendation.action === "lesson" ? "Review" : "Practice"} ${recommendation.topic}` : "Keep building evidence"}</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>{recommendation.reason}</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} aria-label="Refresh recommendation" title="Refresh recommendation" style={{ border: "1px solid var(--card-border)", background: "var(--muted)", borderRadius: 8, padding: 7, cursor: "pointer" }}><RefreshCw size={15} /></button>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
        <a href={link.href} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 8, padding: "10px 14px", background: "var(--primary)", color: "white", fontWeight: 750, textDecoration: "none" }}>{link.label}<ArrowRight size={15} /></a>
        {recommendation.subject && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{recommendation.subject}</span>}
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{recommendation.priority} priority</span>
      </div>
    </section>
  );
}
