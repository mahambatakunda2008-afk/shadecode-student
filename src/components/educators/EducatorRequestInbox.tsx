"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCheck, Clock3, Loader2, MessageCircle, Send, X } from "lucide-react";

type Message = {id:string;request_id:string;sender_id:string;body:string;created_at:string};
type RequestItem = {
  id:string;student_id:string;educator_id:string;subject:string;level:string;topic:string;
  status:"pending"|"accepted"|"declined"|"completed"|"closed";created_at:string;updated_at:string;
  viewerId:string;viewerRole:"student"|"educator";studentName:string;educatorName:string;messages:Message[];
};

export function EducatorRequestInbox() {
  const [items,setItems]=useState<RequestItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [notice,setNotice]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/educator-requests",{cache:"no-store"});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Could not load conversations.");
      setItems(Array.isArray(body.requests)?body.requests:[]);
    }catch(e){setError(e instanceof Error?e.message:"Could not load conversations.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function reply(item:RequestItem){
    const message=(drafts[item.id]??"").trim();
    if(!message)return;
    setBusy(item.id);setError("");setNotice("");
    try{
      const response=await fetch("/api/educator-requests/"+item.id+"/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message})
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Could not send reply.");
      setDrafts(old=>({...old,[item.id]:""}));setNotice("Reply sent.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not send reply.");}
    finally{setBusy(null);}
  }

  async function decide(item:RequestItem,status:"accepted"|"declined"|"completed"|"closed"){
    setBusy(item.id);setError("");setNotice("");
    try{
      const response=await fetch("/api/educator-requests/"+item.id+"/status",{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||"Could not update request.");
      setNotice("Request "+status+".");await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not update request.");}
    finally{setBusy(null);}
  }

  return <div className="mx-auto max-w-5xl space-y-5 px-4 py-7 sm:px-6">
    <header className="space-y-2"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--primary)]">Human learning support</p><h1 className="text-3xl font-bold">Help requests & conversations</h1><p className="text-sm leading-6 text-[var(--muted-foreground)]">A private space for students and educators to discuss learning needs, agree on next steps and follow up.</p></header>
    {error&&<p role="alert" className="rounded-xl bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-[var(--success)]/10 p-3 text-sm">{notice}</p>}
    {loading?<div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 className="animate-spin" size={16}/>Loading conversations…</div>:items.length===0?<div className="rounded-2xl border border-dashed border-[var(--card-border)] p-9 text-center"><MessageCircle size={28} className="mx-auto text-[var(--muted-foreground)]"/><h2 className="mt-3 font-semibold">No conversations yet</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">When a student asks for help or you contact an educator, the conversation will appear here.</p></div>:
      <section className="space-y-4">{items.map(item=>{
        const educator=item.viewerRole==="educator";
        const otherName=educator?item.studentName:item.educatorName;
        const closed=["declined","completed","closed"].includes(item.status);
        return <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--card-border)] p-4">
            <div><h2 className="font-semibold">{otherName}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.subject}{item.level?" · "+item.level:""}{item.topic?" · "+item.topic:""}</p></div>
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs capitalize">{item.status}</span>
          </div>
          <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
            {item.messages.map(message=><div key={message.id} className={message.sender_id===item.viewerId?"flex justify-end":"flex justify-start"}>
              <div className={"max-w-[88%] rounded-2xl px-3 py-2 "+(message.sender_id===item.viewerId?"bg-[var(--primary)]/12":"bg-[var(--surface-2)]")}>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                <p className="mt-1 text-right text-[10px] text-[var(--muted-foreground)]">{new Date(message.created_at).toLocaleString()}</p>
              </div>
            </div>)}
          </div>
          <div className="space-y-3 border-t border-[var(--card-border)] p-4">
            {!closed&&<form onSubmit={e=>{e.preventDefault();void reply(item);}} className="flex items-end gap-2">
              <label className="sr-only" htmlFor={"reply-"+item.id}>Write a reply</label>
              <textarea id={"reply-"+item.id} rows={2} maxLength={4000} value={drafts[item.id]??""} onChange={e=>setDrafts(old=>({...old,[item.id]:e.target.value}))} placeholder="Write a helpful reply…" className="min-w-0 flex-1 resize-y rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2 text-sm"/>
              <button disabled={busy===item.id||!(drafts[item.id]??"").trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-3 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"><Send size={15}/><span className="hidden sm:inline">Send</span></button>
            </form>}
            <div className="flex flex-wrap gap-2">
              {educator&&item.status==="pending"&&<><button disabled={busy===item.id} onClick={()=>void decide(item,"accepted")} className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)]"><Check size={14}/>Accept request</button><button disabled={busy===item.id} onClick={()=>void decide(item,"declined")} className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs"><X size={14}/>Decline</button></>}
              {educator&&item.status==="accepted"&&<button disabled={busy===item.id} onClick={()=>void decide(item,"completed")} className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs"><CheckCheck size={14}/>Mark completed</button>}
              {!educator&&!closed&&<button disabled={busy===item.id} onClick={()=>void decide(item,"closed")} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs">Close request</button>}
              {closed&&<p className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Clock3 size={13}/>This conversation is closed.</p>}
            </div>
          </div>
        </article>;
      })}</section>}
  </div>;
}
