begin;

-- Count existing photos; keep all uploads and established setup completion.
create or replace function public.university_setup_status(institution uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare university public.institutions%rowtype;
begin
  select * into university from public.institutions where id=institution;
  if not found or auth.uid() is null or
    (university.owner_user_id<>auth.uid() and not public.is_admin()) then
    raise exception 'Setup access denied.';
  end if;
  return jsonb_build_object(
    'profile', university.setup_profile_completed_at is not null
      and length(trim(university.name))>=2 and length(trim(university.description))>=3
      and length(trim(university.city))>0 and length(trim(university.state))>0
      and length(trim(university.address))>0 and length(trim(university.phone))>0,
    'courses', exists(select 1 from public.courses where institution_id=institution),
    'gallery', not exists (select 1 from unnest(array['campus','hostel','infrastructure','lab','library','sports','other']) as required(category) where (select count(*) from public.university_media m where m.institution_id=institution and m.media_category=required.category)<3),
    'documents', exists(select 1 from public.institution_verification_documents where institution_id=institution and review_status<>'rejected'),
    'complete', university.setup_completed_at is not null
  );
end $$;

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
      raise exception 'Complete your profile, add a course and upload at least 3 photos in every gallery category first.';
    end if;
    update public.institutions set setup_completed_at=now() where id=institution;
  else
    raise exception 'Invalid setup step.';
  end if;
end $$;

commit;
