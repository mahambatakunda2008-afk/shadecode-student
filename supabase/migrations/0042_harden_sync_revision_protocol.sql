alter table public.sync_revisions add column if not exists client_version bigint;
alter table public.sync_revisions enable row level security;
drop policy if exists sync_revisions_owner_select on public.sync_revisions;
drop policy if exists sync_revisions_owner_insert on public.sync_revisions;
drop policy if exists sync_revisions_owner_update on public.sync_revisions;
create policy sync_revisions_owner_select on public.sync_revisions for select to authenticated using ((select auth.uid()) = user_id);
create policy sync_revisions_owner_insert on public.sync_revisions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sync_revisions_owner_update on public.sync_revisions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.apply_sync_mutation(p_store text,p_operation text,p_record_id text,p_payload jsonb,p_base_version bigint,p_client_version bigint,p_device_id text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_current bigint:=0; v_current_device text; v_current_client_version bigint:=0; v_new bigint;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_store not in ('tasks','subjects','learn_lessons') then raise exception 'Store is not syncable'; end if;
 if p_operation not in ('create','update','delete') then raise exception 'Invalid operation'; end if;
 if p_record_id is null or length(p_record_id)>200 then raise exception 'Invalid record id'; end if;
 if p_base_version is null or p_base_version<0 or p_client_version is null or p_client_version<0 then raise exception 'Invalid version'; end if;
 if p_device_id is null or length(p_device_id)<1 or length(p_device_id)>200 then raise exception 'Invalid device id'; end if;
 insert into public.sync_revisions(user_id,store,record_id,version,device_id,client_version,updated_at) values(v_user,p_store,p_record_id,0,p_device_id,0,now()) on conflict (user_id,store,record_id) do nothing;
 select version,device_id,coalesce(client_version,0) into v_current,v_current_device,v_current_client_version from public.sync_revisions where user_id=v_user and store=p_store and record_id=p_record_id for update;
 if p_base_version<>v_current then
   if v_current_device=p_device_id and p_client_version<=v_current_client_version then return jsonb_build_object('ok',true,'status','already-applied','version',v_current,'store',p_store,'recordId',p_record_id); end if;
   return jsonb_build_object('ok',true,'status','conflict','currentVersion',v_current,'clientVersion',p_client_version,'currentDeviceId',v_current_device,'store',p_store,'recordId',p_record_id);
 end if;
 v_new:=greatest(v_current+1,p_client_version);
 if p_operation='delete' then
   if p_store='tasks' then delete from public.tasks where id::text=p_record_id and user_id=v_user;
   elsif p_store='subjects' then delete from public.subjects where id::text=p_record_id and (user_id=v_user or user_id is null);
   else delete from public.learn_lessons where id::text=p_record_id and user_id=v_user; end if;
 elsif p_store='tasks' then
   insert into public.tasks(id,user_id,subject_id,title,completed) values(p_record_id::uuid,v_user,nullif(p_payload->>'subject_id','')::uuid,coalesce(p_payload->>'title',''),coalesce((p_payload->>'completed')::boolean,false)) on conflict(id) do update set subject_id=excluded.subject_id,title=excluded.title,completed=excluded.completed;
 elsif p_store='subjects' then
   insert into public.subjects(id,user_id,name) values(p_record_id::uuid,v_user,coalesce(p_payload->>'name','')) on conflict(id) do update set name=excluded.name;
 else
   insert into public.learn_lessons(id,user_id,subject_id,title,description,difficulty,progress,blocks) values(p_record_id::uuid,v_user,(p_payload->>'subject_id')::uuid,coalesce(p_payload->>'title',''),coalesce(p_payload->>'description',''),coalesce(p_payload->>'difficulty','medium'),coalesce((p_payload->>'progress')::integer,0),p_payload->'blocks') on conflict(id) do update set subject_id=excluded.subject_id,title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,progress=excluded.progress,blocks=excluded.blocks;
 end if;
 update public.sync_revisions set version=v_new,device_id=p_device_id,client_version=p_client_version,updated_at=now() where user_id=v_user and store=p_store and record_id=p_record_id;
 return jsonb_build_object('ok',true,'status','accepted','version',v_new,'store',p_store,'recordId',p_record_id);
end; $$;
revoke all on function public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text) from public;
grant execute on function public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text) to authenticated;
