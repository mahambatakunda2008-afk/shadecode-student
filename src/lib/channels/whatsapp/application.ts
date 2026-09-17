import "server-only";
import type { ChannelResponse } from "@/lib/channels/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { resolveChannelIdentity } from "@/lib/platform/channel-identity-store";
import { CortexCore } from "@/lib/cortex/core";
import type { ParsedWhatsAppTextEvent } from "@/lib/channels/whatsapp/webhook";
import { inactiveWhatsAppResponse, unlinkedWhatsAppResponse } from "@/lib/channels/whatsapp/response";

export interface WhatsAppApplicationResult { event: ParsedWhatsAppTextEvent; response: ChannelResponse; userId: string | null; }
const LEARNING_COMMANDS = new Set(["LEARN", "EXPLAIN", "TEACH", "HELP"]);

function parseLearningRequest(text: string): { type:"learn"; topic:string } | null {
  const trimmed=text.trim(); if(!trimmed)return null;
  let firstWhitespace=-1; for(let i=0;i<trimmed.length;i+=1){if(/\s/.test(trimmed[i])){firstWhitespace=i;break;}}
  if(firstWhitespace<0)return null; const command=trimmed.slice(0,firstWhitespace).toUpperCase(); if(!LEARNING_COMMANDS.has(command))return null;
  const topic=trimmed.slice(firstWhitespace).trim(); return topic?{type:"learn",topic}:null;
}

export async function dispatchWhatsAppTextEvent(event: ParsedWhatsAppTextEvent): Promise<WhatsAppApplicationResult> {
  const identity=await resolveChannelIdentity("whatsapp",event.externalUserId);
  if(!identity)return {event,userId:null,response:unlinkedWhatsAppResponse()};
  if(identity.status!=="active")return {event,userId:identity.userId,response:inactiveWhatsAppResponse(identity.status)};

  const request=parseLearningRequest(event.text);
  if(!request)return {event,userId:identity.userId,response:{text:"I’m connected to your Shadecode account. Try `LEARN algebra`, `EXPLAIN photosynthesis`, or `HELP binary search`.",metadata:{status:"authenticated",role:identity.role,channel:"whatsapp"}}};

  const supabase=await createSupabaseServerClient();
  const resolved=await resolveLearnerSubjects(supabase,identity.userId);
  if(!resolved.subjects.length){return {event,userId:identity.userId,response:{text:"I can help you learn, but your Shadecode subjects are not configured yet. Choose your subjects in Student first.",metadata:{status:"subjects_required",role:identity.role}}};}
  if(resolved.subjects.length>1){return {event,userId:identity.userId,response:{text:`You have ${resolved.subjects.length} subjects configured. To keep learning tied to the right curriculum, tell me the subject first, for example: `+"`LEARN Mathematics: quadratic functions`"+`.",metadata:{status:"subject_required",subjects:resolved.subjects.map(s=>s.name)}}};}

  const subject=resolved.subjects[0];
  const result=await CortexCore({userId:identity.userId,type:request.type,payload:{topic:request.topic,subjectId:subject.id,subjectName:subject.name}});
  return {event,userId:identity.userId,response:{text:result.response,metadata:{status:"learning",role:identity.role,channel:"whatsapp",subject:subject.name},actions:result.nextAction?[{id:"next",label:"Continue",type:"reply",value:result.nextAction}]:undefined}};
}
