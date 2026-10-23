begin;

alter table public.institutions
  add column setup_profile_completed_at timestamptz,
  add column setup_completed_at timestamptz;

-- Established, approved universities keep their workspace access.
update public.institutions set setup_profile_completed_at=now(), setup_completed_at=now()
where verification_status='approved';

create function public.university_setup_status(institution uuid) returns jsonb
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
    'gallery', exists(select 1 from public.university_media where institution_id=institution and media_category='campus'),
    'documents', exists(select 1 from public.institution_verification_documents where institution_id=institution and review_status<>'rejected'),
    'complete', university.setup_completed_at is not null
  );
end $$;

create function public.complete_university_setup_step(institution uuid, step text) returns void
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
      and (status->>'gallery')::boolean and (status->>'documents')::boolean) then
      raise exception 'Complete your profile, add a course, a campus photo, and a verification document first.';
    end if;
    update public.institutions set setup_completed_at=now() where id=institution;
  else
    raise exception 'Invalid setup step.';
  end if;
end $$;

-- Keep the original upload entry point compatible; the new function reuses
-- its ownership, storage-path, permission, and rate-limit checks atomically.
create function public.record_categorized_upload(institution uuid, path text, kind text, label text, category text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if kind='media' and (category is null or category not in
    ('campus','hostel','infrastructure','lab','library','sports','other')) then
    raise exception 'Choose a valid gallery category.';
  end if;
  perform public.record_upload(institution,path,kind,label);
  if kind='media' then
    update public.university_media set media_category=category
      where institution_id=institution and storage_path=path;
  end if;
end $$;

revoke all on function public.university_setup_status(uuid), public.complete_university_setup_step(uuid,text), public.record_categorized_upload(uuid,text,text,text,text) from public,anon;
grant execute on function public.university_setup_status(uuid), public.complete_university_setup_step(uuid,text), public.record_categorized_upload(uuid,text,text,text,text) to authenticated;
commit;
