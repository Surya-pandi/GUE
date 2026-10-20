-- Update existing installations as well as newly created databases.
begin;

alter table public.institutions
  drop constraint institutions_institution_type_check;

update public.institutions
set institution_type = case institution_type
  when 'Private college' then 'Private university'
  when 'Government college' then 'Government university'
  else institution_type
end
where institution_type in ('Private college', 'Government college');

alter table public.institutions
  add constraint institutions_institution_type_check
  check (institution_type in (
    'University', 'Private university', 'Government university', 'Deemed university'
  ));

-- Preserve the latest workflow implementation and its permissions while
-- updating its user-facing error message.
do $$
begin
  execute replace(
    pg_get_functiondef('public.manage_record(text,jsonb)'::regprocedure),
    'A published college and student account are required.',
    'A published university and student account are required.'
  );
end $$;

commit;
