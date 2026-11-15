import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

export async function POST(request:NextRequest,{params}:{params:Promise<{requestId:string}>}) {
  const limited=await applyRateLimit(request,generalApiLimiter); if(limited) return limited;
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in to reply."},{status:401});
  const {requestId}=await params;
  const body=await request.json().catch(()=>null);
  const message=typeof body?.message==="string"?body.message.replace(/[\x00-\x1f\x7f]/g," ").trim().slice(0,4000):"";
  if(!/^[0-9a-f-]{36}$/i.test(requestId)||!message) return NextResponse.json({error:"A valid conversation and message are required."},{status:400});
  const {data,error}=await supabase.rpc("reply_to_educator_help_request",{p_request_id:requestId,p_message:message});
  if(error) return NextResponse.json({error:error.message||"Could not send your reply."},{status:400});
  return NextResponse.json({ok:true,messageId:data},{status:201});
}
