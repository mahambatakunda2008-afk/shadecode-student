export type DiagramPoint = { x: number; y: number };
export type DiagramStyle = { stroke: string; fill: string; strokeWidth: number };
export type DiagramObject =
  | { id: string; type: "line" | "arrow"; from: DiagramPoint; to: DiagramPoint; style: DiagramStyle }
  | { id: string; type: "rectangle" | "ellipse" | "triangle"; x: number; y: number; width: number; height: number; style: DiagramStyle }
  | { id: string; type: "polygon"; points: DiagramPoint[]; style: DiagramStyle }
  | { id: string; type: "curve"; segments: Array<{ from: DiagramPoint; control: DiagramPoint; to: DiagramPoint }>; style: DiagramStyle }
  | { id: string; type: "text"; x: number; y: number; text: string; fontSize: number; style: DiagramStyle };
export type DiagramBounds = { x: number; y: number; width: number; height: number };
export const DIAGRAM_WIDTH = 1200;
export const DIAGRAM_HEIGHT = 700;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function getDiagramObjectBounds(o: DiagramObject): DiagramBounds {
  let pts: DiagramPoint[];
  if (o.type === "line" || o.type === "arrow") pts = [o.from, o.to];
  else if (o.type === "rectangle" || o.type === "ellipse" || o.type === "triangle") return { x: o.x, y: o.y, width: o.width, height: o.height };
  else if (o.type === "text") return { x: o.x, y: o.y - o.fontSize, width: Math.max(o.fontSize, o.text.length * o.fontSize * .62), height: o.fontSize * 1.4 };
  else if (o.type === "polygon") pts = o.points;
  else pts = o.segments.flatMap(s => [s.from, s.control, s.to]);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
export function translateDiagramObject(o: DiagramObject, dx: number, dy: number): DiagramObject {
  const move = (p: DiagramPoint) => ({ x: p.x + dx, y: p.y + dy });
  switch (o.type) {
    case "line": case "arrow": return { ...o, from: move(o.from), to: move(o.to) };
    case "rectangle": case "ellipse": case "triangle": case "text": return { ...o, x: o.x + dx, y: o.y + dy };
    case "polygon": return { ...o, points: o.points.map(move) };
    case "curve": return { ...o, segments: o.segments.map(s => ({ from: move(s.from), control: move(s.control), to: move(s.to) })) };
  }
}
export function moveDiagramObjectWithinCanvas(o: DiagramObject, dx: number, dy: number): DiagramObject {
  const b = getDiagramObjectBounds(o), x = clamp(b.x + dx, 0, DIAGRAM_WIDTH - b.width), y = clamp(b.y + dy, 0, DIAGRAM_HEIGHT - b.height);
  return translateDiagramObject(o, x - b.x, y - b.y);
}
export function resizeDiagramObject(o: DiagramObject, b: DiagramBounds): DiagramObject {
  const old = getDiagramObjectBounds(o), w = Math.max(1, b.width), h = Math.max(1, b.height), sx = w / Math.max(1, old.width), sy = h / Math.max(1, old.height);
  const scale = (p: DiagramPoint) => ({ x: b.x + (p.x - old.x) * sx, y: b.y + (p.y - old.y) * sy });
  switch (o.type) {
    case "line": case "arrow": return { ...o, from: scale(o.from), to: scale(o.to) };
    case "rectangle": case "ellipse": case "triangle": return { ...o, x: b.x, y: b.y, width: w, height: h };
    case "text": return { ...o, x: b.x, y: b.y + o.fontSize, fontSize: clamp(o.fontSize * Math.min(sx, sy), 8, 120) };
    case "polygon": return { ...o, points: o.points.map(scale) };
    case "curve": return { ...o, segments: o.segments.map(s => ({ from: scale(s.from), control: scale(s.control), to: scale(s.to) })) };
  }
}
function distanceToSegment(p: DiagramPoint, a: DiagramPoint, b: DiagramPoint): number {
  const dx = b.x-a.x, dy=b.y-a.y, d=dx*dx+dy*dy, t=d ? clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1) : 0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function insidePolygon(p: DiagramPoint, pts: DiagramPoint[]): boolean {
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<((b.x-a.x)*(p.y-a.y))/(b.y-a.y)+a.x)inside=!inside;}
  return inside;
}
export function hitTestDiagramObject(o: DiagramObject, p: DiagramPoint, tolerance=10): boolean {
  const b=getDiagramObjectBounds(o);
  if(p.x<b.x-tolerance||p.x>b.x+b.width+tolerance||p.y<b.y-tolerance||p.y>b.y+b.height+tolerance)return false;
  switch(o.type){
    case "line": case "arrow": return distanceToSegment(p,o.from,o.to)<=tolerance;
    case "rectangle": return Math.min(Math.abs(p.x-b.x),Math.abs(p.x-b.x-b.width),Math.abs(p.y-b.y),Math.abs(p.y-b.y-b.height))<=tolerance;
    case "ellipse": {const rx=Math.max(1,o.width/2),ry=Math.max(1,o.height/2),n=Math.sqrt(((p.x-o.x-rx)/rx)**2+((p.y-o.y-ry)/ry)**2);return Math.abs(n-1)*Math.min(rx,ry)<=tolerance;}
    case "triangle": return insidePolygon(p,[{x:o.x+o.width/2,y:o.y},{x:o.x+o.width,y:o.y+o.height},{x:o.x,y:o.y+o.height}]);
    case "polygon": return insidePolygon(p,o.points)||o.points.some((v,i)=>distanceToSegment(p,v,o.points[(i+1)%o.points.length])<=tolerance);
    case "curve": return o.segments.some(s=>{let prev=s.from;for(let i=1;i<=16;i++){const t=i/16,u=1-t,next={x:u*u*s.from.x+2*u*t*s.control.x+t*t*s.to.x,y:u*u*s.from.y+2*u*t*s.control.y+t*t*s.to.y};if(distanceToSegment(p,prev,next)<=tolerance)return true;prev=next;}return false;});
    case "text": return p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
  }
}
export function validateDiagramObject(v: unknown): v is DiagramObject {
  if(!v||typeof v!=="object")return false;
  const o=v as Record<string,unknown>,s=o.style as Record<string,unknown>|undefined;
  if(typeof o.id!=="string"||!o.id||o.id.length>100||!s||typeof s.stroke!=="string"||s.stroke.length>32||typeof s.fill!=="string"||s.fill.length>32||!finite(s.strokeWidth)||s.strokeWidth<.5||s.strokeWidth>40)return false;
  const point=(p:unknown):p is DiagramPoint=>!!p&&typeof p==="object"&&finite((p as DiagramPoint).x)&&finite((p as DiagramPoint).y);
  switch(o.type){
    case "line":case "arrow":return point(o.from)&&point(o.to);
    case "rectangle":case "ellipse":case "triangle":return [o.x,o.y,o.width,o.height].every(finite)&&(o.width as number)>=0&&(o.height as number)>=0;
    case "polygon":return Array.isArray(o.points)&&o.points.length>=3&&o.points.length<=500&&o.points.every(point);
    case "curve":return Array.isArray(o.segments)&&o.segments.length>0&&o.segments.length<=20&&o.segments.every(s=>!!s&&typeof s==="object"&&point((s as {from:unknown}).from)&&point((s as {control:unknown}).control)&&point((s as {to:unknown}).to));
    case "text":return finite(o.x)&&finite(o.y)&&typeof o.text==="string"&&o.text.length<=2000&&finite(o.fontSize)&&o.fontSize>=8&&o.fontSize<=120;
    default:return false;
  }
}
