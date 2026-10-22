begin;

alter table public.profiles add column district text not null default ''
  check (length(district) <= 100);

-- Extend the existing profile workflow, retaining its authorization checks,
-- other operations, and function permissions.
do $$
declare
  definition text := pg_get_functiondef('public.manage_record(text,jsonb)'::regprocedure);
  original text := 'update public.profiles set full_name=';
begin
  if position(original in definition) = 0 then
    raise exception 'Profile workflow could not be found. Apply migrations 001 through 012 first.';
  end if;
  execute replace(definition, original,
    'update public.profiles set district=case when payload ? ''district'' then trim(coalesce(payload->>''district'','''')) else district end,full_name=');
end $$;

notify pgrst, 'reload schema';
commit;
