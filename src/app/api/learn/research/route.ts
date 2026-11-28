import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";
import { createAuthenticatedRequestClient } from "@/lib/supabase/authenticated-request";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { isClassicResearchTextRelevant, isPublicAddress, normalizeClassicResearchUrl, rankClassicResearchResults } from "@/lib/cortex/classicResearch";

export const dynamic = "force-dynamic";

function decode(value: string) {
  return value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
function clean(value:string) { return decode(value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim(); }

function unwrap(href:string) {
  try {
    const u=new URL(decode(href),"https://duckduckgo.com");
    const target=(u.hostname === "duckduckgo.com" || u.hostname.endsWith(".duckduckgo.com")) ? u.searchParams.get("uddg") ?? "" : u.href;
    return normalizeClassicResearchUrl(target);
  } catch { return ""; }
}
async function resolvePublicTarget(raw: string): Promise<{ url: URL; address: string; family: number } | null> {
  try {
    const normalized = normalizeClassicResearchUrl(raw);
    if (!normalized) return null;
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase().replaceAll("[", "").replaceAll("]", "");
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) return null;
    // Pin the selected public DNS answer into the HTTPS socket. The TLS SNI and
    // certificate hostname remain the original domain, preventing a second DNS
    // resolution between validation and connection.
    return { url, address: addresses[0].address, family: addresses[0].family };
  } catch { return null; }
}
function extractPage(html:string) {
 const stripped=html.replace(/<(script|style|nav|footer|header|aside|form|svg|noscript)[\s\S]*?<\/\1>/gi," ")
  .replace(/<\/(p|h[1-6]|li|article|section|div)>/gi,"\n")
  .replace(/<[^>]+>/g," ");
 return clean(stripped).slice(0,12000);
}
async function fetchPage(raw: string): Promise<string> {
  const target = await resolvePublicTarget(raw);
  if (!target) return "";
  return new Promise((resolve) => {
    const { url, address, family } = target;
    let settled = false;
    const finish = (value: string) => { if (!settled) { settled = true; resolve(value); } };
    const request = https.request({
      protocol: "https:", hostname: url.hostname, servername: url.hostname,
      port: 443, path: url.pathname + url.search, method: "GET",
      headers: { "user-agent": "ShadecodeStudent educational resource extractor", accept: "text/html", "accept-encoding": "identity" },
      agent: false,
      lookup: ((_hostname: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => callback(null, address, family)) as never,
    }, (response) => {
      const type = String(response.headers["content-type"] || "");
      if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300 || !type.toLowerCase().includes("text/html")) {
        response.destroy(); finish(""); return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 350000) { response.destroy(); finish(""); return; }
        chunks.push(buffer);
      });
      response.on("end", () => finish(extractPage(Buffer.concat(chunks).toString("utf8"))));
      response.on("error", () => finish(""));
    });
    request.setTimeout(4500, () => { request.destroy(); finish(""); });
    request.on("error", () => finish(""));
    request.end();
  });
}
async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Public search response exceeded the size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
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
  const html=await readBoundedText(response,750000);
  const candidates:Array<{title:string;url:string;snippet:string}>=[];
  const seen=new Set<string>();
  const pattern=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>(.*?)<\/td>)/gi;
  let match; while((match=pattern.exec(html))&&candidates.length<20){
    const url=unwrap(match[1]), title=clean(match[2]), snippet=clean(match[3]||match[4]||"");
    if(!url||!title||snippet.length<70||seen.has(url))continue;
    seen.add(url);
    candidates.push({title:title.slice(0,240),url,snippet:snippet.slice(0,1000)});
  }
  const results=rankClassicResearchResults(candidates,subject,topic,5);
  if(!results.length)return NextResponse.json({error:"No useful public search results"}, {status:404});
  const fetched=await Promise.all(results.slice(0,3).map(async r=>({...r,pageText:await fetchPage(r.url)})));
  // A long page is not automatically a useful page. Only use extracted text
  // when its body independently discusses the requested topic.
  const checked=fetched.map(r=>({...r,pageText:isClassicResearchTextRelevant(r.pageText,subject,topic)?r.pageText:""}));
  const usable=checked.filter(r=>r.pageText.length>=500);
  const enriched=usable.length?usable:checked;
  const blocks=[
   {type:"objective",title:"Research the topic",content:"Non-AI web research. Extracted page text is not independently verified; search excerpts are fallback only."},
   {type:"concept",title:"Research question",content:"Subject: "+subject+"\nTopic: "+topic+"\nCheck source authorship, date, evidence and syllabus alignment."},
   ...enriched.map((r,i)=>({type:"reference",title:"Source "+(i+1)+": "+r.title,content:(r.pageText.length>=500?r.pageText:r.snippet)+"\n\nSource URL: "+r.url+"\n\nStatus: "+(r.pageText.length>=500?"Page text extracted, not independently verified.":"Search excerpt only; page extraction failed.")})),
   {type:"summary",title:"Cross-check before learning",content:"Compare sources and confirm information against your textbook or syllabus. These extracted pages are research material, not a generated lesson."}
  ];
  return NextResponse.json({lesson:{title:"Web research: "+topic,blocks,source:"public-web-search"},sources:enriched.map(({title,url,snippet,pageText})=>({title,url,snippet,extracted:pageText.length>=500}))},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){console.warn("[learn/research]",e);return NextResponse.json({error:"Public web retrieval failed"},{status:503});}
}
