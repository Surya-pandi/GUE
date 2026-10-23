begin;

-- Save a checkbox selection atomically. Existing programmes retain their fees.
create function public.save_course_selection(institution uuid, programmes jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb; added integer := 0;
begin
  if not public.can_manage(institution,'courses') then raise exception 'Access denied.'; end if;
  if jsonb_typeof(programmes) is distinct from 'array' then raise exception 'Select your programmes.'; end if;
  if jsonb_array_length(programmes) not between 1 and 100 then raise exception 'Select between 1 and 100 programmes per save.'; end if;
  perform 1 from public.institutions where id=institution for update;
  for item in select value from jsonb_array_elements(programmes) loop
    if jsonb_typeof(item) is distinct from 'object'
      or length(trim(coalesce(item->>'degree_type',''))) not between 1 and 100 then
      raise exception 'Choose a degree for every programme.';
    end if;
    if not exists(select 1 from public.courses where institution_id=institution
      and lower(trim(name))=lower(trim(item->>'name'))
      and lower(trim(stream))=lower(trim(item->>'stream'))
      and lower(trim(degree_type))=lower(trim(item->>'degree_type'))) then
      perform public.manage_record('course', (item - 'id' - 'remove') || jsonb_build_object('institution_id',institution));
      added := added + 1;
    end if;
  end loop;
  return added;
end $$;
revoke all on function public.save_course_selection(uuid,jsonb) from public,anon;
grant execute on function public.save_course_selection(uuid,jsonb) to authenticated;
commit;
