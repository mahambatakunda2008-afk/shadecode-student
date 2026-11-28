import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRequestClient } from "@/lib/supabase/authenticated-request";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";

function decode(value: string) {
  return value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
function clean(value:string) { return decode(value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim(); }
function unwrap(href:string) {
  try {
    const u=new URL(decode(href),"https://duckduckgo.com");
    const target=u.hostname.endsWith("duckduckgo.com") ? u.searchParams.get("uddg") ?? "" : u.href;
    const final=new URL(target);
    if(final.protocol!=="https:" || !final.hostname || final.hostname==="localhost" || final.hostname.endsWith(".localhost") || final.hostname==="127.0.0.1" || final.hostname==="0.0.0.0" || final.hostname==="::1") return "";
    return final.href;
  } catch { return ""; }
}
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
  const seen=new Set<string>();
  const pattern=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>(.*?)<\/td>)/gi;
  let match; while((match=pattern.exec(html))&&results.length<5){
    const url=unwrap(match[1]), title=clean(match[2]), snippet=clean(match[3]||match[4]||"");
    if(!url||!title||snippet.length<70||seen.has(url))continue;
    seen.add(url);results.push({title:title.slice(0,240),url,snippet:snippet.slice(0,1000)});
  }
  if(!results.length)return NextResponse.json({error:"No useful public search results"}, {status:404});
  const blocks=[
   {type:"objective",title:"Research the topic",content:"This is a non-AI web research collection. These excerpts are discovery aids, not a complete lesson or independently verified teaching material."},
   {type:"concept",title:"Research question",content:"Subject: "+subject+"\nTopic: "+topic+"\nUse the linked sources to investigate the topic. Check the source's author, publication date, evidence and alignment with your syllabus."},
   ...results.map((r,i)=>({type:"reference",title:"Source "+(i+1)+": "+r.title,content:r.snippet+"\n\nSource URL: "+r.url+"\n\nStatus: search excerpt only. The page has not been fetched or independently verified."})),
   {type:"summary",title:"Cross-check before learning",content:"Compare at least two sources and verify key definitions, explanations, examples and syllabus coverage against your textbook or curriculum. Search excerpts alone are insufficient to establish a complete lesson."}
  ];
  return NextResponse.json({lesson:{title:"Web research: "+topic,blocks,source:"public-web-search"},sources:results},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){console.warn("[learn/research]",e);return NextResponse.json({error:"Public web retrieval failed"},{status:503});}
}
