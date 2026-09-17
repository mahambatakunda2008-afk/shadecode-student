import "server-only";
import type { ChannelResponse } from "@/lib/channels/types";
import { buildPlatformRequestContext } from "@/lib/platform/server-context";
import { resolveChannelIdentity } from "@/lib/platform/channel-identity-store";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";
import { CortexCore } from "@/lib/cortex/core";
import type { ParsedWhatsAppTextEvent } from "@/lib/channels/whatsapp/webhook";
import { inactiveWhatsAppResponse, unlinkedWhatsAppResponse } from "@/lib/channels/whatsapp/response";
export interface WhatsAppApplicationResult { event: ParsedWhatsAppTextEvent; response: ChannelResponse; userId: string | null; }
const LEARNING_COMMANDS = new Set(["LEARN", "EXPLAIN", "TEACH", "HELP"]);
function parseLearningRequest(text: string): { type: "learn"; topic: string } | null { const trimmed = text.trim(); if (!trimmed) return null; let firstWhitespace=-1; for(let index=0;index<trimmed.length;index+=1){if(/\s/.test(trimmed[index])){firstWhitespace=index;break;}} if(firstWhitespace<0)return null; const command=trimmed.slice(0,firstWhitespace).toUpperCase(); if(!LEARNING_COMMANDS.has(command))return null; const topic=trimmed.slice(firstWhitespace).trim(); if(!topic)return null; return {type:"learn",topic}; }
export async function dispatchWhatsAppTextEvent(event: ParsedWhatsAppTextEvent): Promise<WhatsAppApplicationResult> {
 const identity=await resolveChannelIdentity("whatsapp",event.externalUserId); if(!identity)return {event,userId:null,response:unlinkedWhatsAppResponse()}; if(identity.status!=="active")return {event,userId:identity.userId,response:inactiveWhatsAppResponse(identity.status)};
 const context=await buildPlatformRequestContext({userId:identity.userId,role:identity.role,channel:"whatsapp",metadata:{whatsappMessageId:event.messageId,whatsappPhoneNumberId:event.phoneNumberId}});
 const learningRequest=parseLearningRequest(event.text); if(!learningRequest)return {event,userId:context.identity.userId,response:{text:"I’m connected to your Shadecode account. Try `LEARN algebra`, `EXPLAIN photosynthesis`, or `HELP binary search`.",metadata:{status:"authenticated",role:context.identity.role,channel:context.identity.channel}}};
 const curriculum=await resolveUserSystemCurriculum(context.identity.userId); if(curriculum.blocked&&!curriculum.context)return {event,userId:context.identity.userId,response:{text:`I can help you learn ${learningRequest.topic}, but I need your exact curriculum subject configured in Shadecode first. ${curriculum.reason ?? "Choose your subject and syllabus in the app."}`,metadata:{status:"curriculum_required",role:context.identity.role}}};
 const result=await CortexCore({userId:context.identity.userId,type:learningRequest.type,payload:{topic:learningRequest.topic},curriculum:curriculum.context??null});
 return {event,userId:context.identity.userId,response:{text:result.response,metadata:{status:"learning",role:context.identity.role,channel:context.identity.channel,curriculumResolved:!curriculum.blocked},actions:result.nextAction?[{id:"next",label:"Continue",type:"reply",value:result.nextAction}]:undefined}};
}
