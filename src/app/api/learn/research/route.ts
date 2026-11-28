import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createAuthenticatedRequestClient } from "@/lib/supabase/authenticated-request";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";

function decode(value: string) {
  return value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
function clean(value:string) { return decode(value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim(); }
function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a,b] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 0 || b === 168)) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0) return false;
    return true;
  }
  if (version === 6) {
    const ip = address.toLowerCase();
    return (ip.startsWith("2") || ip.startsWith("3")) &&
      !ip.startsWith("2001:db8:") && !ip.startsWith("2001:10:") && !ip.startsWith("2001:20:");
  }
  return false;
}
function unwrap(href:string) {
  try {
    const u=new URL(decode(href),"https://duckduckgo.com");
    const target=u.hostname.endsWith("duckduckgo.com") ? u.searchParams.get("uddg") ?? "" : u.href;
    const final=new URL(target);
    if(final.protocol!=="https:" || !final.hostname || final.username || final.password || final.port || isIP(final.hostname)) return "";
    return final.href;
  } catch { return ""; }
}
async function safeFetchUrl(raw:string): Promise<URL | null> {
  try {
    const u=new URL(raw);
    const hostname=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");
    if(u.protocol!=="https:" || u.username || u.password || u.port || !hostname ||
       hostname==="localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || isIP(hostname)) return null;
    const addresses=await lookup(hostname,{all:true,verbatim:true});
    if(!addresses.length || addresses.some(({address})=>!isPublicAddress(address))) return null;
    return u;
  } catch { return null; }
}
function extractPage(html:string) {
 const stripped=html.replace(/<(script|style|nav|footer|header|aside|form|svg|noscript)[\s\S]*?<\/\1>/gi," ")
  .replace(/<\/(p|h[1-6]|li|article|section|div)>/gi,"\n")
  .replace(/<[^>]+>/g," ");
 return clean(stripped).slice(0,12000);
}
async function fetchPage(raw:string) { const url=await safeFetchUrl(raw); if(!url)return ""; try { const r=await fetch(url.href,{redirect:"manual",signal:AbortSignal.timeout(4500),cache:"no-store",headers:{"user-agent":"ShadecodeStudent educational resource extractor","accept":"text/html"}}); if(!r.ok||r.status>=300)return ""; const type=r.headers.get("content-type")||"";if(!type.includes("text/html"))return ""; const html=(await r.text()).slice(0,350000);return extractPage(html); }catch{return "";} }
export async function GET(request:NextRequest) {
 const limited=await applyRateLimit(request,generalApiLimiter); if(limited)return limited;
 const params=request.nextUrl.searchParams; const subject=(params.get("subject")??"").trim().slice(0,60); const topic=(params.get("topic")??"").trim().slice(0,160);
 if(!subject||topic.length<2)return NextResponse.json({error:"subject and topic required"},{status:400});
 try {
  const auth=await createAuthenticatedRequestClient(request); if(!auth)return NextResponse.json({error:"Sign in to search learning resources"},{status:401});
  const access=await resolveLearnerSubject(auth.supabase,auth.user.id,subject); if(!access.ok)return NextResponse.json({error:access.error,code:"SUBJECT_NOT_ALLOWED"},{status:access.status});
  const query=encodeURIComponent(subject+" "+topic+" lesson explained");
  const response=await fetch("https://html.duckduckgo.com/html/?q="+query,{headers:{"user-agent":"Mozilla/5.0 (compatible; ShadecodeStudent/1.0; educational retrieval)","accept":"text/html"},signal:AbortSignal.timeout(7000),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Public search unavailable"},{status:502});
  const html=(await response.text()).slice(0,750000);
  const results:Array<{title:string;url:string;snippet:string}>=[];
  const topicTerms=topic.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=4 && !["about","from","with","that","this","into","lesson","explained"].includes(t));
  const seen=new Set<string>();
  const pattern=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>(.*?)<\/td>)/gi;
  let match; while((match=pattern.exec(html))&&results.length<5){
    const url=unwrap(match[1]), title=clean(match[2]), snippet=clean(match[3]||match[4]||"");
    const searchable=(title+" "+snippet+" "+url).toLowerCase();
    if(!url||!title||snippet.length<70||seen.has(url)||!topicTerms.some(term=>searchable.includes(term)))continue;
    seen.add(url);results.push({title:title.slice(0,240),url,snippet:snippet.slice(0,1000)});
  }
  if(!results.length)return NextResponse.json({error:"No useful public search results"}, {status:404});
  const fetched=await Promise.all(results.slice(0,3).map(async r=>({...r,pageText:await fetchPage(r.url)})));
  const usable=fetched.filter(r=>r.pageText.length>=500);
  const enriched=usable.length?usable:fetched;
  const blocks=[
   {type:"objective",title:"Research the topic",content:"Non-AI web research. Extracted page text is not independently verified; search excerpts are fallback only."},
   {type:"concept",title:"Research question",content:"Subject: "+subject+"\nTopic: "+topic+"\nCheck source authorship, date, evidence and syllabus alignment."},
   ...enriched.map((r,i)=>({type:"reference",title:"Source "+(i+1)+": "+r.title,content:(r.pageText.length>=500?r.pageText:r.snippet)+"\n\nSource URL: "+r.url+"\n\nStatus: "+(r.pageText.length>=500?"Page text extracted, not independently verified.":"Search excerpt only; page extraction failed.")})),
   {type:"summary",title:"Cross-check before learning",content:"Compare sources and confirm information against your textbook or syllabus. These extracted pages are research material, not a generated lesson."}
  ];
  return NextResponse.json({lesson:{title:"Web research: "+topic,blocks,source:"public-web-search"},sources:enriched.map(({title,url,snippet,pageText})=>({title,url,snippet,extracted:pageText.length>=500}))},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){console.warn("[learn/research]",e);return NextResponse.json({error:"Public web retrieval failed"},{status:503});}
}
