create table if not exists public.sync_revisions (
  user_id uuid not null references auth.users(id) on delete cascade,
  store text not null,
  record_id text not null,
  version bigint not null default 0 check (version >= 0),
  device_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, record_id)
);
create index if not exists sync_revisions_user_updated_idx on public.sync_revisions(user_id, updated_at desc);
alter table public.sync_revisions enable row level security;
drop policy if exists sync_revisions_owner_select on public.sync_revisions;
create policy sync_revisions_owner_select on public.sync_revisions for select to authenticated using ((select auth.uid()) = user_id);
create or replace function public.apply_sync_mutation(p_store text,p_operation text,p_record_id text,p_payload jsonb,p_base_version bigint,p_client_version bigint,p_device_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_current bigint:=0; v_new bigint; v_table text; v_row jsonb;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_store not in ('tasks','subjects','learn_lessons','education_profile') then raise exception 'Store is not syncable'; end if;
 if p_operation not in ('create','update','delete') then raise exception 'Invalid operation'; end if;
 if p_record_id is null or length(p_record_id)>200 then raise exception 'Invalid record id'; end if;
 if p_base_version is null or p_base_version<0 or p_client_version is null or p_client_version<0 then raise exception 'Invalid version'; end if;
 v_table:=case when p_store='education_profile' then 'user_profiles' else p_store end;
 select version into v_current from public.sync_revisions where user_id=v_user and store=p_store and record_id=p_record_id for update;
 v_current:=coalesce(v_current,0);
 if p_base_version<>v_current then return jsonb_build_object('ok',true,'status','conflict','currentVersion',v_current,'clientVersion',p_client_version,'store',p_store,'recordId',p_record_id); end if;
 v_new:=greatest(v_current+1,p_client_version);
 if p_operation='delete' then execute format('delete from public.%I where id=$1 and user_id=$2',v_table) using p_record_id,v_user;
 else v_row:=p_payload||jsonb_build_object('id',p_record_id,'user_id',v_user); if p_store='education_profile' then execute 'update public.user_profiles set education_stage=coalesce($3->>''educationStage'',education_stage), education_grade=coalesce(($3->>''educationGrade'')::integer,education_grade), education_year=coalesce($3->>''educationYear'',education_year), education_curriculum=coalesce($3->>''educationCurriculum'',education_curriculum), education_subjects=coalesce($3->''educationSubjects'',education_subjects), updated_at=now() where user_id=$1' using v_user,v_user,v_row; if not found then raise exception 'Education profile not found'; end if; else execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1) on conflict (id) do update set updated_at=now()',v_table,v_table) using v_row; end if; end if;
 insert into public.sync_revisions(user_id,store,record_id,version,device_id,updated_at) values(v_user,p_store,p_record_id,v_new,p_device_id,now()) on conflict (user_id,store,record_id) do update set version=excluded.version,device_id=excluded.device_id,updated_at=excluded.updated_at;
 return jsonb_build_object('ok',true,'status','accepted','version',v_new,'store',p_store,'recordId',p_record_id);
end; $$;
revoke all on function public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text) from public;
grant execute on function public.apply_sync_mutation(text,text,text,jsonb,bigint,bigint,text) to authenticated;
