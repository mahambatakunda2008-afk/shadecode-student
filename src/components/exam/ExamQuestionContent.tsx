"use client";
import { renderMath } from "@/lib/exam/mathText";
import type { ExamContentBlock, ExamDiagramShape } from "@/lib/exam/types";

import { normalizeExamContent } from "@/lib/exam/structuredContent";
export { normalizeExamContent } from "@/lib/exam/structuredContent";

function Graph({block}:{block:Extract<ExamContentBlock,{type:"graph"}>}) {
  const xs=block.points.map(p=>p.x), ys=block.points.map(p=>p.y);
  const xmin=Math.min(...xs), xmax=Math.max(...xs), ymin=Math.min(0,...ys), ymax=Math.max(...ys);
  const sx=xmax-xmin||1, sy=ymax-ymin||1;
  const px=(x:number)=>58+(x-xmin)/sx*500, py=(y:number)=>300-(y-ymin)/sy*250;
  return <figure className="my-5 rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
    {block.caption&&<figcaption className="mb-2 text-xs font-semibold">{block.caption}</figcaption>}
    <svg viewBox="0 0 600 360" role="img" aria-label={`${block.yLabel} against ${block.xLabel}`} className="h-auto w-full">
      <line x1="58" y1="300" x2="570" y2="300" stroke="currentColor" strokeWidth="1.5"/><line x1="58" y1="25" x2="58" y2="300" stroke="currentColor" strokeWidth="1.5"/>
      {[0,1,2,3,4].map(i=><line key={i} x1="58" x2="570" y1={300-i*62.5} y2={300-i*62.5} stroke="#cbd5e1" strokeDasharray="4 5"/>)}
      <polyline points={block.points.map(p=>`${px(p.x)},${py(p.y)}`).join(" ")} fill="none" stroke="#0891b2" strokeWidth="3" strokeLinejoin="round"/>
      {block.points.map((p,i)=><circle key={i} cx={px(p.x)} cy={py(p.y)} r="5" fill="#0891b2"/>)}
      <text x="310" y="345" textAnchor="middle" fontSize="14" fill="currentColor">{block.xLabel}</text>
      <text x="16" y="165" textAnchor="middle" fontSize="14" fill="currentColor" transform="rotate(-90 16 165)">{block.yLabel}</text>
    </svg>
  </figure>;
}
function Diagram({block}:{block:Extract<ExamContentBlock,{type:"diagram"}>}) {
  return <figure className="my-5 rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
    {block.caption&&<figcaption className="mb-2 text-xs font-semibold">{block.caption}</figcaption>}
    <svg viewBox="0 0 600 360" role="img" aria-label={block.caption||"Question diagram"} className="h-auto w-full">
      {block.shapes.map((s,i)=>{
        if(s.type==="line") return <g key={i}><line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#334155" strokeWidth="2.5"/>{s.label&&<text x={(s.x1+s.x2)/2} y={(s.y1+s.y2)/2-7} fontSize="13" fill="#0f172a">{s.label}</text>}</g>;
        if(s.type==="rect") return <g key={i}><rect x={s.x} y={s.y} width={s.width} height={s.height} fill="#ecfeff" stroke="#0e7490" strokeWidth="2.5"/>{s.label&&<text x={s.x+s.width/2} y={s.y+s.height/2} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#0f172a">{s.label}</text>}</g>;
        if(s.type==="circle") return <g key={i}><circle cx={s.cx} cy={s.cy} r={s.r} fill="#ecfeff" stroke="#0e7490" strokeWidth="2.5"/>{s.label&&<text x={s.cx} y={s.cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="#0f172a">{s.label}</text>}</g>;
        return <text key={i} x={s.x} y={s.y} fontSize="14" fill="#0f172a">{s.text}</text>;
      })}
    </svg>
  </figure>;
}
export default function ExamQuestionContent({content}:{content?:unknown}) {
  const blocks=normalizeExamContent(content);
  if(!blocks.length) return null;
  return <div className="mt-4 space-y-3">{blocks.map((b,i)=>{
    if(b.type==="text") return <div key={i} className="text-sm leading-7" dangerouslySetInnerHTML={{__html:renderMath(b.text)}}/>;
    if(b.type==="table") return <div key={i} className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
      {b.caption&&<p className="mb-2 text-xs font-semibold">{b.caption}</p>}
      <table className="w-full border-collapse text-left text-sm"><thead><tr>{b.headers.map((h,j)=><th key={j} className="border-b border-slate-300 px-3 py-2 font-bold" dangerouslySetInnerHTML={{__html:renderMath(h)}}/>)}</tr></thead><tbody>{b.rows.map((row,j)=><tr key={j} className="odd:bg-slate-50">{row.map((cell,k)=><td key={k} className="border-b border-slate-100 px-3 py-2" dangerouslySetInnerHTML={{__html:renderMath(cell)}}/>)}</tr>)}</tbody></table>
    </div>;
    if(b.type==="graph") return <Graph key={i} block={b}/>;
    return <Diagram key={i} block={b}/>;
  })}</div>;
}