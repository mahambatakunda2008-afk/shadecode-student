import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";
const clean = (value: unknown, max: number) => typeof value === "string"
  ? value.replace(/[\x00-\x1f\x7f]/g," ").replace(/\s+/g," ").trim().slice(0,max) : "";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {data:{user}} = await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in to view your educator conversations."},{status:401});
  const {data:requests,error} = await supabase.from("platform_educator_help_requests")
    .select("id,student_id,educator_id,subject,level,topic,status,created_at,updated_at")
    .order("updated_at",{ascending:false}).limit(100);
  if(error) return NextResponse.json({error:"Could not load conversations."},{status:500});
  const ids=(requests??[]).map(r=>r.id);
  const {data:messages,error:messageError} = ids.length
    ? await supabase.from("platform_educator_help_messages").select("id,request_id,sender_id,body,created_at").in("request_id",ids).order("created_at",{ascending:true})
    : {data:[],messageError:null};
  if(messageError) return NextResponse.json({error:"Could not load conversation messages."},{status:500});
  const participantIds=[...new Set((requests??[]).flatMap(r=>[r.student_id,r.educator_id]))];
  const admin=createSupabaseAdminClient();
  const {data:profiles}=admin&&participantIds.length
    ? await admin.from("platform_educator_profiles").select("user_id,display_name").eq("status","approved").in("user_id",participantIds)
    : {data:[]};
  const names=new Map((profiles??[]).map(p=>[p.user_id,p.display_name]));
  return NextResponse.json({requests:(requests??[]).map(r=>({
    ...r,viewerRole:r.student_id===user.id?"student":"educator",
    studentName:names.get(r.student_id)??"Student",
    educatorName:names.get(r.educator_id)??"Educator",
    messages:(messages??[]).filter(m=>m.request_id===r.id),
  }))},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:NextRequest) {
  const limited=await applyRateLimit(request,generalApiLimiter); if(limited) return limited;
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in to contact an educator."},{status:401});
  const body=await request.json().catch(()=>null);
  const educatorId=clean(body?.educatorId,64);
  const subject=clean(body?.subject,120);
  const level=clean(body?.level,100);
  const topic=clean(body?.topic,180);
  const message=clean(body?.message,4000);
  if(!educatorId||!subject||message.length<10) return NextResponse.json({error:"Choose a subject and write a message of at least 10 characters."},{status:400});
  const {data,error}=await supabase.rpc("create_educator_help_request",{
    p_educator_id:educatorId,p_subject:subject,p_level:level,p_topic:topic,p_message:message
  });
  if(error) return NextResponse.json({error:error.message||"Could not send your request."},{status:400});
  return NextResponse.json({ok:true,requestId:data},{status:201});
}
