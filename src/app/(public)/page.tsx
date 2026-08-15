"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  Calculator,
  ChevronDown,
  GraduationCap,
  Target,
  WifiOff,
  Zap,
} from "lucide-react";

const BRAND = "/brand/shadecode-mark.svg";

function GlobalStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box}
      html{scroll-behavior:smooth}
      body{background:#07070d}
      .rise{animation:rise .7s ease both}
      .float{animation:float 5s ease-in-out infinite}
      .nav-link{color:#94a3b8;text-decoration:none;font-size:14px;transition:color .2s}
      .nav-link:hover{color:#f8fafc}
      .primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:#2563eb;color:#fff;padding:13px 22px;border-radius:12px;text-decoration:none;font-weight:800;transition:.2s;box-shadow:0 12px 35px rgba(37,99,235,.22)}
      .primary:hover{transform:translateY(-2px);background:#1d4ed8;box-shadow:0 18px 45px rgba(37,99,235,.3)}
      .secondary{display:inline-flex;align-items:center;justify-content:center;gap:9px;background:rgba(255,255,255,.05);color:#f8fafc;padding:13px 22px;border-radius:12px;border:1px solid rgba(255,255,255,.1);text-decoration:none;font-weight:700;transition:.2s}
      .secondary:hover{transform:translateY(-2px);background:rgba(255,255,255,.08)}
      .card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:20px}
      .card:hover{border-color:rgba(37,99,235,.3)}
      .grid{background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:56px 56px}
      .gradient{background:linear-gradient(135deg,#fff 10%,#bfdbfe 52%,#60a5fa);-webkit-background-clip:text;background-clip:text;color:transparent}
      @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
      @media(max-width:760px){.nav-links{display:none!important}.hero{grid-template-columns:1fr!important}.hero-copy{text-align:center;align-items:center!important}.cta{justify-content:center!important}.three{grid-template-columns:1fr!important}.two{grid-template-columns:1fr!important}.stats{grid-template-columns:1fr 1fr!important}}
    `}</style>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <img src={BRAND} alt="" aria-hidden="true" style={{ width: compact ? 32 : 40, height: compact ? 32 : 40, objectFit: "contain" }} />
      <span style={{ color: "#f8fafc", fontWeight: 850, letterSpacing: "-.02em" }}>
        Shadecode <span style={{ color: "#60a5fa" }}>Student</span>
      </span>
    </span>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"6px 12px", borderRadius:999, background:"rgba(37,99,235,.1)", border:"1px solid rgba(37,99,235,.25)", color:"#93c5fd", fontSize:12, fontWeight:800, letterSpacing:".06em", textTransform:"uppercase" }}>{children}</span>;
}

function Nav() {
  return <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:20, height:68, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(7,7,13,.84)", backdropFilter:"blur(18px)", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
    <Link href="/" style={{ textDecoration:"none" }}><Brand compact /></Link>
    <div className="nav-links" style={{ display:"flex", gap:28 }}>
      <a className="nav-link" href="#intelligence">Intelligence</a><a className="nav-link" href="#features">Features</a><a className="nav-link" href="#future">The future</a><a className="nav-link" href="#faq">FAQ</a>
    </div>
    <div style={{ display:"flex", gap:8 }}><Link href="/auth/login" className="secondary" style={{ padding:"9px 15px", fontSize:13 }}>Sign in</Link><Link href="/auth/signup" className="primary" style={{ padding:"9px 15px", fontSize:13 }}>Get started</Link></div>
  </nav>;
}

function IntelligencePanel() {
  const stats = [["Maths","72%"],["Physics","51%"],["Trigonometry","38%"]];
  return <div className="float card" style={{ padding:20, maxWidth:500, width:"100%", background:"rgba(10,10,20,.9)", boxShadow:"0 30px 90px rgba(0,0,0,.55),0 0 70px rgba(37,99,235,.12)" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}><div style={{ display:"flex", alignItems:"center", gap:9 }}><BrainCircuit size={20} color="#60a5fa"/><strong style={{ color:"#bfdbfe" }}>Cortex Learning State</strong></div><span style={{ width:9,height:9,borderRadius:"50%",background:"#22c55e",animation:"pulse 2s infinite" }}/></div>
    <div className="stats" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>{stats.map(([name,value])=><div key={name} style={{ padding:12,borderRadius:12,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.06)" }}><small style={{ color:"#64748b" }}>{name}</small><div style={{ color:"#60a5fa",fontWeight:900,fontSize:20,marginTop:3 }}>{value}</div><div style={{ height:4,background:"rgba(255,255,255,.06)",borderRadius:99,marginTop:7 }}><div style={{ width:value,height:"100%",background:"#2563eb",borderRadius:99 }}/></div></div>)}</div>
    <div style={{ padding:13,borderRadius:12,background:"rgba(37,99,235,.08)",border:"1px solid rgba(37,99,235,.18)" }}><div style={{ color:"#60a5fa",fontWeight:800,fontSize:12,marginBottom:5 }}>NEXT INTERVENTION</div><p style={{ color:"#cbd5e1",lineHeight:1.55,fontSize:13 }}>Your errors increase when trigonometric identities are hidden inside multi-step problems. Try two targeted questions, then reassess.</p></div>
    <div style={{ display:"flex",gap:8,marginTop:10 }}>{["Observe","Understand","Predict","Act"].map((x,i)=><div key={x} style={{ flex:1,textAlign:"center",padding:"7px 3px",borderRadius:8,background:i===3?"rgba(37,99,235,.18)":"rgba(255,255,255,.03)",color:i===3?"#93c5fd":"#475569",fontSize:9,fontWeight:800 }}>{x}</div>)}</div>
  </div>;
}

function Hero() {
  return <section className="grid" style={{ minHeight:"100vh",padding:"135px 24px 85px",position:"relative",overflow:"hidden" }}>
    <div style={{ position:"absolute",width:500,height:500,borderRadius:"50%",left:"4%",top:"15%",background:"radial-gradient(circle,rgba(37,99,235,.18),transparent 68%)",filter:"blur(30px)",pointerEvents:"none" }}/>
    <div style={{ position:"absolute",width:550,height:550,borderRadius:"50%",right:0,bottom:0,background:"radial-gradient(circle,rgba(96,165,250,.12),transparent 68%)",filter:"blur(35px)",pointerEvents:"none" }}/>
    <div className="hero rise" style={{ maxWidth:1180,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:70,alignItems:"center",position:"relative" }}>
      <div className="hero-copy" style={{ display:"flex",flexDirection:"column",alignItems:"flex-start",gap:22 }}>
        <Brand />
        <Badge><BrainCircuit size={14}/> Learning intelligence, not just AI chat</Badge>
        <h1 style={{ fontSize:"clamp(2.8rem,6vw,5rem)",lineHeight:1.02,letterSpacing:"-.045em",fontWeight:950,color:"#f8fafc" }}>A learning system that <span className="gradient">learns how you learn.</span></h1>
        <p style={{ color:"#94a3b8",fontSize:"clamp(1rem,1.7vw,1.2rem)",lineHeight:1.75,maxWidth:560 }}>Lessons, questions, mistakes, exams, revision and study behaviour become one evolving learning experience, built with Cambridge and ZIMSEC learners in mind.</p>
        <div className="cta" style={{ display:"flex",gap:10,flexWrap:"wrap" }}><Link href="/auth/signup" className="primary">Start studying free <ArrowRight size={17}/></Link><Link href="#intelligence" className="secondary">See how it works</Link></div>
        <p style={{ color:"#475569",fontSize:12 }}>Free to start · PWA · Designed for imperfect connectivity</p>
      </div>
      <div style={{ display:"flex",justifyContent:"center" }}><IntelligencePanel/></div>
    </div>
  </section>;
}

function IntelligenceSection() {
  const loop = [["01","Observe","Attempts, exam results, focus sessions, mistakes and study signals become evidence."],["02","Understand","Cortex builds a growing picture of concepts, mastery, recurring errors and learning behaviour."],["03","Predict","The system estimates what needs attention and what kind of intervention may help."],["04","Act","Instead of another generic tip, the learner gets a targeted next action."],["05","Evaluate","Shadecode checks whether the intervention actually changed the next outcome."],["06","Learn","The result updates the learning state, making future guidance more useful."]];
  return <section id="intelligence" style={{ padding:"110px 24px" }}><div style={{ maxWidth:1050,margin:"0 auto" }}><div style={{ textAlign:"center",maxWidth:720,margin:"0 auto 60px" }}><Badge><BrainCircuit size={14}/> The Cortex loop</Badge><h2 style={{ color:"#f8fafc",fontSize:"clamp(2rem,4vw,3.2rem)",lineHeight:1.1,marginTop:18,fontWeight:900 }}>From answers to understanding the learner.</h2><p style={{ color:"#64748b",lineHeight:1.75,marginTop:15 }}>The advantage is not a larger chatbot. It is a system that remembers evidence, tests interventions and improves its understanding of the student.</p></div><div className="three" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>{loop.map(([n,t,d])=><div key={n} className="card" style={{ padding:22 }}><span style={{ color:"#60a5fa",fontSize:11,fontWeight:900 }}>{n}</span><h3 style={{ color:"#f8fafc",fontSize:18,margin:"12px 0 8px" }}>{t}</h3><p style={{ color:"#64748b",fontSize:13,lineHeight:1.7 }}>{d}</p></div>)}</div></div></section>;
}

function Features() {
  const features = [[BrainCircuit,"Cortex","Learning intelligence","Weak-area signals, insights and recommendations become part of a persistent learning state."],[Calculator,"Math Checker","Learn from your mistakes","Upload handwritten work and get step-level feedback that explains where the reasoning went wrong."],[Target,"Exam Simulation","Practice under pressure","Timed practice helps you rehearse real exam conditions and turn results into revision signals."],[BookOpen,"Exam Hub","Turn past papers into practice","Searchable past-paper workflows bring exam material into a more usable study loop."],[Zap,"Study tools","Make consistency easier","Tasks, timetables, focus sessions, XP, achievements, streaks and analytics keep the routine moving."],[WifiOff,"Offline foundations","Built for real connectivity","A PWA direction helps Shadecode work in environments where reliable internet cannot be assumed."]];
  return <section id="features" style={{ padding:"110px 24px",background:"rgba(255,255,255,.015)",borderTop:"1px solid rgba(255,255,255,.05)",borderBottom:"1px solid rgba(255,255,255,.05)" }}><div style={{ maxWidth:1050,margin:"0 auto" }}><div style={{ textAlign:"center",marginBottom:55 }}><Badge><Zap size={14}/> The toolkit</Badge><h2 style={{ color:"#f8fafc",fontSize:"clamp(2rem,4vw,3rem)",marginTop:18,fontWeight:900 }}>Many tools. One learning system.</h2></div><div className="two" style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12 }}>{features.map(([Icon,name,title,desc])=><div key={name as string} className="card" style={{ padding:26,display:"flex",gap:18 }}><div style={{ width:48,height:48,flexShrink:0,borderRadius:14,display:"grid",placeItems:"center",background:"rgba(37,99,235,.09)",color:"#60a5fa" }}><Icon size={22}/></div><div><div style={{ color:"#60a5fa",fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:".06em" }}>{name}</div><h3 style={{ color:"#f8fafc",margin:"7px 0",fontSize:18 }}>{title}</h3><p style={{ color:"#64748b",fontSize:13,lineHeight:1.7 }}>{desc}</p></div></div>)}</div></div></section>;
}

function FutureSection() {
  const paths=["Learning State Engine","Adaptive Intervention Engine","Learning Graph","Privacy-conscious student model","Small local models","Compression and model routing"];
  return <section id="future" style={{ padding:"120px 24px" }}><div className="two" style={{ maxWidth:1050,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:50,alignItems:"center" }}><div><Badge><Zap size={14}/> Where this goes</Badge><h2 style={{ color:"#f8fafc",fontSize:"clamp(2rem,4vw,3.1rem)",lineHeight:1.1,marginTop:18,fontWeight:900 }}>The next breakthrough is underneath the interface.</h2><p style={{ color:"#64748b",lineHeight:1.75,marginTop:16 }}>The immediate priority is a reliable Learning State Engine. From there, Shadecode can investigate adaptive interventions, a curriculum-to-mastery Learning Graph, a privacy-conscious student model and specialized local intelligence.</p><p style={{ color:"#64748b",lineHeight:1.75,marginTop:14 }}>These are research directions, not claims that every piece already exists. Build the foundation, measure it, then expand.</p></div><div className="card" style={{ padding:26 }}><div style={{ color:"#60a5fa",fontWeight:900,marginBottom:15 }}>RESEARCH PATH</div>{paths.map((x,i)=><div key={x} style={{ display:"flex",gap:12,alignItems:"center",padding:"12px 0",borderTop:i?"1px solid rgba(255,255,255,.06)":"none" }}><span style={{ width:26,height:26,borderRadius:8,display:"grid",placeItems:"center",background:"rgba(37,99,235,.1)",color:"#60a5fa",fontSize:11,fontWeight:900 }}>{i+1}</span><span style={{ color:"#cbd5e1",fontSize:13 }}>{x}</span></div>)}</div></div></section>;
}

function Trust() {
  const items=[[GraduationCap,"Curriculum-aware","Designed around real student work, with Cambridge and ZIMSEC as important starting points."],[WifiOff,"Connectivity-aware","A PWA and offline-first direction matters when reliable internet cannot be taken for granted."],[BadgeCheck,"Evidence-driven","Learning interventions should be measured, not merely advertised as intelligent."]];
  return <section style={{ padding:"75px 24px",background:"rgba(255,255,255,.018)",borderTop:"1px solid rgba(255,255,255,.05)",borderBottom:"1px solid rgba(255,255,255,.05)" }}><div style={{ maxWidth:1000,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:30 }} className="three">{items.map(([Icon,title,desc])=><div key={title as string}><Icon size={24} color="#60a5fa" style={{ marginBottom:10 }}/><h3 style={{ color:"#f8fafc",fontSize:15,marginBottom:6 }}>{title}</h3><p style={{ color:"#64748b",fontSize:13,lineHeight:1.65 }}>{desc}</p></div>)}</div></section>;
}

function FAQ() {
  const [open,setOpen]=useState<number|null>(null);
  const faqs=[["What is Shadecode Student?","An AI-powered learning platform evolving toward a personal learning system that continuously builds an understanding of how a student learns."],["What is Cortex?","Cortex is the learning-intelligence layer. Its long-term loop is Observe, Understand, Predict, Act, Evaluate and Learn."],["Is the deeper Learning Intelligence system finished?","No. The Learning State Engine and deeper adaptive capabilities are part of the next architectural phase. Current features are the foundation."],["Who is it for?","Students, especially learners working through structured curricula such as Cambridge and ZIMSEC, who want tutoring, exam practice, feedback and better revision decisions in one place."],["Does it work offline?","Shadecode Student is a PWA with offline foundations. Individual features can have different offline behaviour while this area is actively engineered."],["Is it free?","The current product is free to start. Future premium or school offerings are possible, but usefulness and retention come first."]];
  return <section id="faq" style={{ padding:"100px 24px" }}><div style={{ maxWidth:760,margin:"0 auto" }}><div style={{ textAlign:"center",marginBottom:45 }}><Badge><BookOpen size={14}/> FAQ</Badge><h2 style={{ color:"#f8fafc",fontSize:"clamp(2rem,4vw,2.7rem)",marginTop:18,fontWeight:900 }}>Questions students actually ask.</h2></div>{faqs.map(([q,a],i)=><div key={q} className="card" style={{ marginBottom:8,overflow:"hidden" }}><button onClick={()=>setOpen(open===i?null:i)} aria-expanded={open===i} style={{ width:"100%",border:0,background:"none",color:"#f8fafc",padding:"19px 20px",display:"flex",justifyContent:"space-between",textAlign:"left",cursor:"pointer",fontWeight:750 }}><span>{q}</span><ChevronDown size={18} color="#60a5fa" style={{ transform:open===i?"rotate(180deg)":"none",transition:"transform .2s" }}/></button>{open===i&&<div style={{ padding:"0 20px 20px",color:"#64748b",lineHeight:1.75,fontSize:14 }}>{a}</div>}</div>)}</div></section>;
}

function FinalCTA() {
  return <section style={{ padding:"105px 24px",textAlign:"center",position:"relative",overflow:"hidden",borderTop:"1px solid rgba(255,255,255,.05)" }}><div style={{ position:"absolute",inset:0,background:"radial-gradient(circle at 50% 0,rgba(37,99,235,.17),transparent 60%)",pointerEvents:"none" }}/><div style={{ position:"relative",maxWidth:700,margin:"0 auto" }}><img src={BRAND} alt="Shadecode" style={{ width:62,height:62,objectFit:"contain",margin:"0 auto 25px" }}/><h2 style={{ color:"#f8fafc",fontSize:"clamp(2.2rem,5vw,3.6rem)",lineHeight:1.05,fontWeight:950 }}>Stop guessing what to study next.</h2><p style={{ color:"#64748b",lineHeight:1.75,fontSize:16,maxWidth:520,margin:"18px auto 30px" }}>Start with the tools that exist today. Help build the learning system that gets smarter with evidence.</p><Link href="/auth/signup" className="primary">Start studying free <ArrowRight size={17}/></Link><p style={{ color:"#334155",fontSize:12,marginTop:16 }}>No card required.</p></div></section>;
}

function Footer() {
  return <footer style={{ borderTop:"1px solid rgba(255,255,255,.06)",padding:"35px 24px" }}><div style={{ maxWidth:1050,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,flexWrap:"wrap" }}><Link href="/" style={{ textDecoration:"none" }}><Brand compact/></Link><div style={{ display:"flex",gap:22,flexWrap:"wrap" }}><Link className="nav-link" href="/dashboard">Dashboard</Link><Link className="nav-link" href="/exam-sim">Exam Sim</Link><Link className="nav-link" href="/analytics">Analytics</Link><Link className="nav-link" href="/auth/login">Sign in</Link></div><span style={{ color:"#334155",fontSize:12 }}>© {new Date().getFullYear()} Shadecode Student</span></div></footer>;
}

export default function HomePage() {
  return <div style={{ minHeight:"100vh",background:"#07070d",color:"#f8fafc",overflowX:"hidden" }}><GlobalStyles/><Nav/><Hero/><IntelligenceSection/><Features/><FutureSection/><Trust/><FAQ/><FinalCTA/><Footer/></div>;
}
