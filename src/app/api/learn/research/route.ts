import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRequestClient } from "@/lib/supabase/authenticated-request";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";

function decode(value: string) {
  return value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
function clean(value:string) { return decode(value.replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim(); }
function unwrap(href:string) { try { const u=new URL(decode(href),"https://duckduckgo.com"); return u.hostname.endsWith("duckduckgo.com") ? u.searchParams.get("uddg") ?? "" : u.href; } catch { return ""; } }
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
  const entries:string[]=[]; const pattern=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>(.*?)<\/td>)/gi;
  let match; while((match=pattern.exec(html))&&entries.length<6){const href=unwrap(match[1]);const title=clean(match[2]);const snippet=clean(match[3]||match[4]||"");if(href.startsWith("http")&&title&&snippet)entries.push(JSON.stringify({title,url:href,snippet}));}
  const results=entries.map(x=>JSON.parse(x)); if(!results.length)return NextResponse.json({error:"No useful public search results"}, {status:404});
  const blocks=[{type:"objective",title:"Retrieved learning resources",content:"Classic mode uses public-web search excerpts, not generative AI. Review each source before treating its information as reliable."},{type:"concept",title:"Search context",content:"Subject: "+subject+"\nTopic: "+topic+"\nThese are search-result excerpts only. Full pages have not been independently checked."},...results.map((r:any,i)=>({type:"reference",title:"Source "+(i+1)+": "+r.title,content:r.snippet+"\n\nURL: "+r.url+"\n\nSource status: public search excerpt, not independently verified."})),{type:"summary",title:"Use sources critically",content:"Compare multiple sources, check dates and author/publisher credentials, and confirm details against your syllabus or textbook."}];
  return NextResponse.json({lesson:{title:"Web research: "+topic,blocks,source:"public-web-search"},sources:results},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){console.warn("[learn/research]",e);return NextResponse.json({error:"Public web retrieval failed"},{status:503});}
}