/** Transport-neutral channel identity contract. */
import "server-only";
import type { ClientChannel, ClientRole } from "@/lib/channels/types";
export interface ChannelIdentityRecord{id:string;channel:ClientChannel;externalUserId:string;userId:string;role:ClientRole;status:"active"|"blocked"|"unlinked";linkedAt:string;}
export function normalizeChannelExternalId(value:string):string{const normalized=value.trim();if(!normalized||normalized.length>255)throw new Error("Invalid external channel identity.");return normalized;}
export function isActiveChannelIdentity(identity:ChannelIdentityRecord|null):identity is ChannelIdentityRecord{return identity?.status==="active";}
