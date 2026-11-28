import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";
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
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const value = octets.reduce((result, part) => (result * 256) + part, 0);
    const inRange = (network: number[], prefix: number) => {
      const base = network.reduce((result, part) => (result * 256) + part, 0);
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      return ((value >>> 0) & mask) === ((base >>> 0) & mask);
    };
    // IANA special-purpose, private, loopback, link-local, documentation,
    // benchmarking, multicast and reserved IPv4 ranges.
    const denied: Array<[number[], number]> = [
      [[0,0,0,0],8], [[10,0,0,0],8], [[100,64,0,0],10],
      [[127,0,0,0],8], [[169,254,0,0],16], [[172,16,0,0],12],
      [[192,0,0,0],24], [[192,0,2,0],24], [[192,88,99,0],24],
      [[192,168,0,0],16], [[198,18,0,0],15], [[198,51,100,0],24],
      [[203,0,113,0],24], [[224,0,0,0],4], [[240,0,0,0],4],
    ];
    return !denied.some(([network, prefix]) => inRange(network, prefix));
  }
  if (version === 6) {
    // Only accept globally allocated unicast space (2000::/3). Explicitly
    // exclude protocol assignments, transition mechanisms and documentation.
    const parts = address.toLowerCase().split(":");
    const first = Number.parseInt(parts[0] || "0", 16);
    const second = Number.parseInt(parts[1] || "0", 16);
    if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) return false;
    if (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)) return false; // IETF special-purpose and documentation blocks
    if (first === 0x2002) return false; // 6to4
    if (first === 0x3fff && second <= 0x0fff) return false; // documentation
    return true;
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
async function resolvePublicTarget(raw: string): Promise<{ url: URL; address: string; family: number } | null> {
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^\\[|\\]$/g, "");
    if (url.protocol !== "https:" || url.username || url.password || url.port || !hostname ||
      hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || isIP(hostname)) return null;
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
  const candidates:Array<{title:string;url:string;snippet:string;score:number}>=[];
  const stopwords=new Set(["about","from","with","that","this","into","lesson","explained","their","there","which","where","what","when","have","will","your","using","used"]);
  const terms=(value:string)=>Array.from(new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((term)=>term.length>=3&&!stopwords.has(term))));
  const topicTerms=terms(topic), subjectTerms=terms(subject);
  const seen=new Set<string>();
  const pattern=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>(.*?)<\/td>)/gi;
  let match; while((match=pattern.exec(html))&&candidates.length<15){
    const url=unwrap(match[1]), title=clean(match[2]), snippet=clean(match[3]||match[4]||"");
    const searchable=(title+" "+snippet).toLowerCase();
    if(!url||!title||snippet.length<70||seen.has(url))continue;
    const topicHits=topicTerms.filter((term)=>searchable.includes(term)).length;
    const subjectHits=subjectTerms.filter((term)=>searchable.includes(term)).length;
    const topicCoverage=topicTerms.length?topicHits/topicTerms.length:1;
    const subjectCoverage=subjectTerms.length?subjectHits/subjectTerms.length:1;
    // Topic match is mandatory. Subject overlap improves ranking without
    // rejecting sources that use the discipline's conventional terminology.
    if(topicHits===0 || (topicTerms.length>=3 && topicCoverage<0.34))continue;
    const titleText=title.toLowerCase();
    const titleTopicHits=topicTerms.filter((term)=>titleText.includes(term)).length;
    const score=(topicCoverage*6)+(subjectCoverage*2)+(titleTopicHits*2)+(snippet.length>=180?0.5:0);
    seen.add(url);
    candidates.push({title:title.slice(0,240),url,snippet:snippet.slice(0,1000),score});
  }
  const results=candidates.sort((a,b)=>b.score-a.score).slice(0,5).map(({score,...result})=>result);
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
