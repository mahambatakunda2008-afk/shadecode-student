-- Replaces an earlier, simpler teacher_tutorials table (draft/in_review/verified, no versions) with the tutorial studio schema
-- in the migrations that follow. The simple table was never deployed to users; this refuses to run if it somehow holds data.
-- Harmless on a fresh database, where neither the table nor the policies exist.
do $$
declare n bigint;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teacher_tutorials' and column_name = 'blocks'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teacher_tutorials' and column_name = 'version'
  ) then
    execute 'select count(*) from public.teacher_tutorials' into n;
    if n > 0 then
      raise exception 'teacher_tutorials (simple schema) holds % rows; refusing to drop', n;
    end if;
    drop table public.teacher_tutorials cascade;
  end if;
end $$;

-- Superseded by the studio's stricter, folder-and-tutorial-scoped media policies.
drop policy if exists "teachers upload own media" on storage.objects;
drop policy if exists "teachers delete own media" on storage.objects;
