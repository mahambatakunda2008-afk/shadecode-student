"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Application = {
  display_name: string; educator_type: string; bio: string; subjects: string[]; levels: string[];
  experience_years: number | null; status: string; review_note: string | null;
};

const subjectOptions = ["Mathematics","Further Mathematics","Physics","Chemistry","Biology","Computer Science","English Language","Geography","History","Economics","Business Studies","Accounting","Agriculture","Other"];
const levelOptions = ["Primary","Lower Secondary","O Level","AS Level","A Level","IB","IGCSE","University","Professional"];

export default function EducatorApplicationPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [educatorType, setEducatorType] = useState("independent_tutor");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/educators/application").then(async r => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Could not load application.");
      if (body.application) {
        const a = body.application as Application;
        setApplication(a); setDisplayName(a.display_name); setEducatorType(a.educator_type);
        setBio(a.bio); setSubjects(a.subjects); setLevels(a.levels);
        setExperienceYears(a.experience_years == null ? "" : String(a.experience_years));
      }
    }).catch(e => setError(e instanceof Error ? e.message : "Could not load application."))
      .finally(() => setBusy(false));
  }, []);

  function toggle(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/educators/application", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, educatorType, bio, subjects, levels, experienceYears }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not submit application.");
      setMessage("Application saved. It remains pending until a Shadecode administrator reviews it.");
      setApplication({ display_name: displayName, educator_type: educatorType, bio, subjects, levels,
        experience_years: experienceYears ? Number(experienceYears) : null, status: body.status, review_note: null });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit application."); }
    finally { setSaving(false); }
  }

  const editable = !application || ["pending", "changes_requested"].includes(application.status);
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--primary)]">Shadecode Educators</p>
      <h1 className="text-3xl font-bold">Teach beyond the classroom.</h1>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">Independent tutors, subject specialists, school teachers and educational creators can apply to contribute lessons, tutorials, resources and learning support. You do not need to belong to a school on Shadecode.</p>
    </header>
    {application && <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <p className="font-semibold">Application status: <span className="capitalize">{application.status.replaceAll("_", " ")}</span></p>
      {application.review_note && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{application.review_note}</p>}
      {application.status === "approved" && <Link href="/teacher/tutorials" className="mt-3 inline-block text-sm font-semibold text-[var(--primary)]">Open educator workspace →</Link>}
      {application.status === "pending" && <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your profile is awaiting review. You cannot publish or represent yourself as verified while pending.</p>}
    </section>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {message && <p role="status" className="text-sm text-[var(--success)]">{message}</p>}
    {busy ? <p className="text-sm text-[var(--muted-foreground)]">Loading application…</p> : editable && <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <label className="block space-y-1 text-sm"><span>Public display name</span><input required minLength={2} maxLength={100} value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3" /></label>
      <label className="block space-y-1 text-sm"><span>How do you teach?</span><select value={educatorType} onChange={e=>setEducatorType(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3">
        <option value="independent_tutor">Independent tutor</option><option value="subject_specialist">Subject specialist</option><option value="independent_teacher">Independent teacher</option><option value="education_creator">Educational content creator</option>
      </select></label>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Subjects you can support</legend><div className="flex flex-wrap gap-2">{subjectOptions.map(value=><button key={value} type="button" onClick={()=>toggle(value,subjects,setSubjects)} aria-pressed={subjects.includes(value)} className={`rounded-full border px-3 py-2 text-xs ${subjects.includes(value)?"border-[var(--primary)] bg-[var(--primary)]/10":"border-[var(--card-border)]"}`}>{value}</button>)}</div></fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Levels / programmes</legend><div className="flex flex-wrap gap-2">{levelOptions.map(value=><button key={value} type="button" onClick={()=>toggle(value,levels,setLevels)} aria-pressed={levels.includes(value)} className={`rounded-full border px-3 py-2 text-xs ${levels.includes(value)?"border-[var(--primary)] bg-[var(--primary)]/10":"border-[var(--card-border)]"}`}>{value}</button>)}</div></fieldset>
      <label className="block space-y-1 text-sm"><span>Short educator introduction</span><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={1600} rows={4} placeholder="What do you teach, how do you approach learning, and what support can students expect?" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3" /></label>
      <label className="block max-w-xs space-y-1 text-sm"><span>Years of teaching / tutoring experience (optional)</span><input type="number" min="0" max="70" value={experienceYears} onChange={e=>setExperienceYears(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3" /></label>
      <button disabled={saving || !subjects.length || !levels.length} className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50">{saving?"Saving…":application?"Update application":"Apply to become a Shadecode educator"}</button>
      <p className="text-xs leading-5 text-[var(--muted-foreground)]">Approval is separate from school membership. It grants no access to student records, classes or administration. Review and publication permissions remain separate.</p>
    </form>}
  </main>;
}
