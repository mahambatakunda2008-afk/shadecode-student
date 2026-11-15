import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{requestId:string}>}) {
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Sign in first."},{status:401});
  const {requestId}=await params;
  const body=await request.json().catch(()=>null);
  const status=body?.status;
  if(!/^[0-9a-f-]{36}$/i.test(requestId)||!["accepted","declined","completed","closed"].includes(status)) {
    return NextResponse.json({error:"Invalid request status."},{status:400});
  }
  const {data,error}=await supabase.rpc("set_educator_help_request_status",{p_request_id:requestId,p_status:status});
  if(error||!data) return NextResponse.json({error:error?.message||"Could not update this request."},{status:400});
  return NextResponse.json({ok:true,status});
}
