import type { ExamContentBlock, ExamDiagramShape } from "./types";
type R = Record<string, unknown>;
const obj = (v: unknown): v is R => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 500): string | null => typeof v === "string" && v.trim().length > 0 && v.length <= max ? v : null;
const num = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1_000_000 ? v : null;
const coord = (v: unknown): number | null => { const n = num(v); return n === null ? null : Math.max(0, Math.min(600, n)); };

function shapeOf(v: unknown): ExamDiagramShape | null {
  if (!obj(v) || typeof v.type !== "string") return null;
  const label = str(v.label, 100) ?? undefined;
  if (v.type === "line") {
    const [x1,y1,x2,y2] = [v.x1,v.y1,v.x2,v.y2].map(coord);
    if ([x1,y1,x2,y2].some(x => x === null)) return null;
    return {type:"line",x1:x1!,y1:y1!,x2:x2!,y2:y2!,...(label?{label}:{})};
  }
  if (v.type === "rect") {
    const x=coord(v.x),y=coord(v.y),width=num(v.width),height=num(v.height);
    if(x===null||y===null||width===null||height===null||width<=0||height<=0||width>600||height>360)return null;
    return {type:"rect",x,y,width,height,...(label?{label}:{})};
  }
  if (v.type === "circle") {
    const cx=coord(v.cx),cy=coord(v.cy),r=num(v.r);
    if(cx===null||cy===null||r===null||r<=0||r>180)return null;
    return {type:"circle",cx,cy,r,...(label?{label}:{})};
  }
  if (v.type === "text") {
    const x=coord(v.x),y=coord(v.y),content=str(v.text,160);
    if(x===null||y===null||!content)return null;
    return {type:"text",x,y,text:content};
  }
  return null;
}

/** Accepts only bounded, typed blocks. Unknown or malformed provider content is ignored. */
export function normalizeExamContent(value: unknown): ExamContentBlock[] {
  if(!Array.isArray(value))return [];
  const out:ExamContentBlock[]=[];
  for(const item of value.slice(0,12)){
    if(!obj(item)||typeof item.type!=="string")continue;
    const caption=str(item.caption,180)??undefined;
    if(item.type==="text"){
      const content=str(item.text,4000);if(content)out.push({type:"text",text:content});
    }else if(item.type==="table"&&Array.isArray(item.headers)&&Array.isArray(item.rows)){
      const headers=item.headers.slice(0,8).map(v=>str(v,120));
      const rows=item.rows.slice(0,30).map(row=>Array.isArray(row)?row.slice(0,8).map(v=>str(v,160)):[]);
      if(headers.length>=2&&headers.every(Boolean)&&rows.length&&rows.every(row=>row.length===headers.length&&row.every(Boolean)))
        out.push({type:"table",headers:headers as string[],rows:rows as string[][],...(caption?{caption}:{})});
    }else if(item.type==="graph"&&Array.isArray(item.points)){
      const xLabel=str(item.xLabel,100),yLabel=str(item.yLabel,100);
      const points=item.points.slice(0,40).map(p=>obj(p)?{x:num(p.x),y:num(p.y)}:null);
      if(xLabel&&yLabel&&points.length>=2&&points.every(p=>p&&p.x!==null&&p.y!==null))
        out.push({type:"graph",xLabel,yLabel,points:points as Array<{x:number;y:number}>,...(caption?{caption}:{})});
    }else if(item.type==="diagram"&&Array.isArray(item.shapes)){
      const shapes=item.shapes.slice(0,40).map(shapeOf).filter((s):s is ExamDiagramShape=>s!==null);
      if(shapes.length)out.push({type:"diagram",shapes,...(caption?{caption}:{})});
    }
  }
  return out;
}