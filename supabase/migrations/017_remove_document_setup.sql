begin;

-- Remove the document requirement without deleting existing private files.
create or replace function public.complete_university_setup_step(institution uuid, step text) returns void
language plpgsql security definer set search_path='' as $$
declare status jsonb;
begin
  -- Lock the university so concurrent setup submissions are serialized.
  perform 1 from public.institutions where id=institution for update;
  status := public.university_setup_status(institution);
  if step='profile' then
    if not exists(select 1 from public.institutions where id=institution
      and length(trim(name))>=2 and length(trim(description))>=3
      and length(trim(city))>0 and length(trim(state))>0
      and length(trim(address))>0 and length(trim(phone))>0) then
      raise exception 'Complete the university name, overview, city, state, address, and phone first.';
    end if;
    update public.institutions set setup_profile_completed_at=now() where id=institution;
  elsif step='finish' then
    if not ((status->>'profile')::boolean and (status->>'courses')::boolean
      and (status->>'gallery')::boolean) then
      raise exception 'Complete your profile, add a course and a campus photo first.';
    end if;
    update public.institutions set setup_completed_at=now() where id=institution;
  else
    raise exception 'Invalid setup step.';
  end if;
end $$;

commit;
