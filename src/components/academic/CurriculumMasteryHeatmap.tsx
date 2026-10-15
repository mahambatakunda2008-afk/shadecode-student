"use client";

import { useEffect, useMemo, useState } from "react";
import { projectSyllabusHeatmap, type HeatmapObjective, type MasteryBand } from "@/lib/curriculum/syllabusMasteryHeatmap";

type SyllabusPayload = {
  id: string; syllabus_id: string | null; syllabus_version: string | null;
  qualification_id: string | null; subject_id: string | null;
  objectives: HeatmapObjective[];
};
const palette: Record<MasteryBand, {label:string; color:string; bg:string}> = {
  insufficient_evidence: {label:"Not enough evidence", color:"var(--muted-foreground)", bg:"var(--surface-2)"},
  needs_work: {label:"Needs work", color:"#f87171", bg:"rgba(248,113,113,.16)"},
  developing: {label:"Developing", color:"#fbbf24", bg:"rgba(251,191,36,.16)"},
  mastered: {label:"Mastered", color:"#34d399", bg:"rgba(52,211,153,.16)"},
};

export default function CurriculumMasteryHeatmap() {
  const [syllabi, setSyllabi] = useState<SyllabusPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/curriculum/mastery-heatmap")
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load mastery data.");
        return payload.syllabi as SyllabusPayload[];
      })
      .then(data => { if (alive) { setSyllabi(data ?? []); setSelected(data?.[0]?.id ?? ""); } })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Unable to load mastery data."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const current = syllabi.find(s => s.id === selected) ?? syllabi[0];
  const projected = useMemo(() => current ? projectSyllabusHeatmap(current.objectives) : null, [current]);

  return (
    <section aria-labelledby="syllabus-mastery-title" style={{border:"1px solid var(--card-border)",background:"var(--card)",borderRadius:18,padding:20,marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
        <div>
          <h2 id="syllabus-mastery-title" style={{fontSize:17,fontWeight:750,color:"var(--foreground)",margin:"0 0 5px"}}>Syllabus mastery</h2>
          <p style={{fontSize:12,color:"var(--muted-foreground)",margin:0}}>Topic-by-topic view from your recorded curriculum assessments.</p>
        </div>
        {syllabi.length > 1 && <label style={{fontSize:12,color:"var(--muted-foreground)"}}>Syllabus{" "}
          <select aria-label="Choose syllabus" value={selected} onChange={e=>setSelected(e.target.value)} style={{maxWidth:240,background:"var(--surface-2)",color:"var(--foreground)",border:"1px solid var(--card-border)",borderRadius:8,padding:"7px 9px"}}>
            {syllabi.map(s=><option key={s.id} value={s.id}>{[s.subject_id,s.qualification_id,s.syllabus_version].filter(Boolean).join(" · ") || s.syllabus_id || "Syllabus"}</option>)}
          </select>
        </label>}
      </div>

      {loading ? <p style={{fontSize:13,color:"var(--muted-foreground)",marginTop:18}}>Loading syllabus evidence…</p>
      : error ? <p role="alert" style={{fontSize:13,color:"var(--danger)",marginTop:18}}>{error}</p>
      : !current || !projected?.cells.length ? <div style={{marginTop:18,padding:14,borderRadius:12,background:"var(--surface-2)"}}>
          <p style={{fontSize:13,color:"var(--foreground)",fontWeight:650,margin:"0 0 4px"}}>No verified syllabus objectives are available yet.</p>
          <p style={{fontSize:12,color:"var(--muted-foreground)",margin:0}}>Once your syllabus is verified and assessment evidence is recorded, this map will populate.</p>
        </div>
      : <>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:16,marginBottom:14}}>
          <Stat label="Syllabus outcomes" value={projected.summary.total}/>
          <Stat label="With evidence" value={projected.summary.evidenced}/>
          <Stat label="Evidence average" value={projected.summary.averageMastery === null ? "—" : `${projected.summary.averageMastery}%`}/>
        </div>
        <div aria-label="Mastery legend" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
          {(Object.keys(palette) as MasteryBand[]).map(b=><span key={b} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"var(--muted-foreground)"}}><i aria-hidden="true" style={{width:9,height:9,borderRadius:3,background:palette[b].color}}/>{palette[b].label}</span>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:12}}>
          {projected.groups.map(group=><div key={group.key} style={{border:"1px solid var(--card-border)",borderRadius:12,padding:12,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"baseline",marginBottom:9}}>
              <h3 style={{fontSize:12,fontWeight:700,color:"var(--foreground)",margin:0}}>{group.title}</h3>
              <span style={{fontSize:11,color:"var(--muted-foreground)",whiteSpace:"nowrap"}}>{group.averageMastery === null ? "No evidence" : `${group.averageMastery}% avg`}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(27px,1fr))",gap:4}}>
              {group.cells.map(cell=><div key={cell.objective_key} title={`${cell.objective_key} · ${cell.title}: ${palette[cell.band].label}${cell.mastery === null ? "" : ` (${cell.mastery}%)`}; ${cell.evidenceAttempts} assessment attempt(s)`} aria-label={`${cell.title}, ${palette[cell.band].label}${cell.mastery === null ? "" : `, ${cell.mastery} percent`}`} style={{height:27,borderRadius:5,background:palette[cell.band].bg,border:`1px solid color-mix(in srgb, ${palette[cell.band].color} 35%, transparent)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:palette[cell.band].color,overflow:"hidden"}}>{cell.objective_key}</div>)}
            </div>
            <p style={{fontSize:10,color:"var(--muted-foreground)",margin:"9px 0 0"}}>{group.evidencedCount}/{group.cells.length} outcomes assessed</p>
          </div>)}
        </div>
        <p style={{fontSize:10,color:"var(--muted-foreground)",margin:"12px 0 0"}}>Bands are descriptive (under 60: needs work; 60–79: developing; 80+: mastered). They are not an exam-grade prediction. Unattempted outcomes are shown as unknown, not zero.</p>
      </>}
    </section>
  );
}

function Stat({label,value}:{label:string;value:string|number}) {
 return <div style={{padding:"8px 11px",background:"var(--surface-2)",border:"1px solid var(--card-border)",borderRadius:10}}>
   <div style={{fontSize:10,color:"var(--muted-foreground)",marginBottom:2}}>{label}</div>
   <div style={{fontSize:15,fontWeight:750,color:"var(--foreground)"}}>{value}</div>
 </div>;
}
