"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Search, UserRound } from "lucide-react";

type Educator = { id: string; displayName: string; educatorType: string; bio: string; subjects: string[]; levels: string[]; experienceYears: number | null };
const subjects = ["Mathematics","Further Mathematics","Physics","Chemistry","Biology","Computer Science","English Language","Geography","History","Economics","Business Studies","Accounting","Agriculture"];
const levels = ["Primary","Lower Secondary","O Level","AS Level","A Level","IB","IGCSE","University","Professional"];

export default function EducatorDirectoryPage() {
  const [items,setItems] = useState<Educator[]>([]);
  const [subject,setSubject] = useState("");
  const [level,setLevel] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState<Educator|null>(null);
  const [contactSubject,setContactSubject] = useState("");
  const [contactLevel,setContactLevel] = useState("");
  const [contactTopic,setContactTopic] = useState("");
  const [contactMessage,setContactMessage] = useState("");
  const [sending,setSending] = useState(false);
  const [contactError,setContactError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if(subject) params.set("subject",subject);
      if(level) params.set("level",level);
      const response = await fetch(`/api/learn/educators?${params}`,{cache:"no-store"});
      const body = await response.json();
      if(!response.ok) throw new Error(body.error || "Could not load educators.");
      setItems(Array.isArray(body.educators)?body.educators:[]);
    } catch(e) { setError(e instanceof Error?e.message:"Could not load educators."); }
    finally { setLoading(false); }
  }, [subject, level]);
  useEffect(()=>{void load();},[load]);

  function startContact(item:Educator){setSelected(item);setContactSubject(item.subjects[0]??"");setContactLevel(item.levels[0]??"");setContactTopic("");setContactMessage("");setContactError("");}
  async function sendRequest(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selected)return;setSending(true);setContactError("");
    try{const response=await fetch("/api/educator-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({educatorId:selected.id,subject:contactSubject,level:contactLevel,topic:contactTopic,message:contactMessage})});const body=await response.json();if(!response.ok)throw new Error(body.error||"Could not send your request.");router.push("/learn/educator-requests");}
    catch(e){setContactError(e instanceof Error?e.message:"Could not send your request.");}finally{setSending(false);}
  }

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6">
    <header className="space-y-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--primary)]">Human learning support</p><h1 className="text-3xl font-bold">Find a real educator.</h1><p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Discover approved independent tutors, subject specialists and teachers who contribute learning resources to Shadecode. No school membership required.</p></header>
    <section className="grid gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:grid-cols-[1fr_1fr_auto]">
      <label className="space-y-1 text-xs font-medium"><span>Subject</span><select value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 text-sm"><option value="">All subjects</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></label>
      <label className="space-y-1 text-xs font-medium"><span>Level / programme</span><select value={level} onChange={e=>setLevel(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3 text-sm"><option value="">All levels</option>{levels.map(l=><option key={l}>{l}</option>)}</select></label>
      <button onClick={()=>void load()} className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)]"><Search size={16}/>Find educators</button>
    </section>
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {loading ? <p className="text-sm text-[var(--muted-foreground)]">Finding educators…</p> : items.length===0 ? <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-8 text-center"><GraduationCap size={28} className="mx-auto text-[var(--muted-foreground)]"/><h2 className="mt-3 font-semibold">No matching educators yet</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Try another subject or level. New educators appear after approval.</p><Link href="/learn/resources" className="mt-4 inline-block text-sm font-semibold text-[var(--primary)]">Explore learning resources →</Link></div> :
      <section className="grid gap-3 sm:grid-cols-2">{items.map(item=><article key={item.id} className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><UserRound size={21}/></span><div><h2 className="font-semibold">{item.displayName}</h2><p className="text-xs capitalize text-[var(--muted-foreground)]">{item.educatorType.replaceAll("_"," ")}{item.experienceYears==null?"":` · ${item.experienceYears} years experience`}</p></div></div>
        {item.bio && <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.bio}</p>}
        <div className="space-y-1 text-xs"><p><strong>Subjects:</strong> {item.subjects.join(", ")}</p><p><strong>Levels:</strong> {item.levels.join(", ")}</p></div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--card-border)] pt-3"><p className="text-xs text-[var(--muted-foreground)]">Approved Shadecode educator</p><button onClick={()=>startContact(item)} className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)]">Request help</button></div>
      </article>)}</section>}
    {selected&&<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
      <section role="dialog" aria-modal="true" aria-labelledby="educator-request-title" className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Contact educator</p><h2 id="educator-request-title" className="mt-1 text-xl font-bold">Ask {selected.displayName} for help</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Describe what you are learning and where you are stuck. Keep personal contact details out of your message.</p></div><button onClick={()=>setSelected(null)} aria-label="Close request form" className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">Close</button></div>
        <form onSubmit={sendRequest} className="space-y-3">
          <label className="block space-y-1 text-sm"><span>Subject</span><select value={contactSubject} onChange={e=>setContactSubject(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3">{selected.subjects.map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span>Level</span><select value={contactLevel} onChange={e=>setContactLevel(e.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3">{selected.levels.map(l=><option key={l}>{l}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span>Topic (optional)</span><input value={contactTopic} onChange={e=>setContactTopic(e.target.value)} maxLength={180} placeholder="e.g. Integration by substitution" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3"/></label>
          <label className="block space-y-1 text-sm"><span>What do you need help with?</span><textarea required minLength={10} maxLength={4000} rows={5} value={contactMessage} onChange={e=>setContactMessage(e.target.value)} placeholder="Explain the question, concept or skill you need help with…" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-3"/></label>
          {contactError&&<p role="alert" className="text-sm text-[var(--danger)]">{contactError}</p>}
          <button disabled={sending||contactMessage.trim().length<10} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50">{sending?"Sending request…":"Send help request"}</button>
        </form>
      </section>
    </div>}
  </main>;
}
