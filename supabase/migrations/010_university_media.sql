-- Run after 009. Rename the existing table in place to retain rows, grants,
-- foreign keys and row-level security policies.
begin;

alter table public.college_media rename to university_media;

do $$
declare item record;
begin
  for item in
    select conname from pg_constraint
    where conrelid = 'public.university_media'::regclass
      and conname like 'college_media%'
  loop
    execute format('alter table public.university_media rename constraint %I to %I',
      item.conname, replace(item.conname, 'college_media', 'university_media'));
  end loop;

  -- Constraint-backed indexes were renamed along with their constraints.
  for item in
    select indexrelid::regclass as index_name, c.relname
    from pg_index i join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'public.university_media'::regclass
      and c.relname like 'college_media%'
  loop
    execute format('alter index %s rename to %I', item.index_name,
      replace(item.relname, 'college_media', 'university_media'));
  end loop;

  -- PL/pgSQL bodies contain textual references that a table rename does not
  -- rewrite. CREATE OR REPLACE preserves existing function permissions.
  execute replace(
    pg_get_functiondef('public.record_upload(uuid,text,text,text)'::regprocedure),
    'public.college_media', 'public.university_media'
  );
  execute replace(
    pg_get_functiondef('public.approve_asset(text,uuid,boolean)'::regprocedure),
    'public.college_media', 'public.university_media'
  );
end $$;

notify pgrst, 'reload schema';
commit;
