begin;

-- Preserve the existing publication field names for discovery and booking RLS.
-- Completing setup now publishes the university, without an admin decision.
create function public.publish_completed_university() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.setup_completed_at is not null and new.removed_at is null
    and new.verification_status in ('pending','approved') then
    new.verification_status := 'approved';
    new.published_at := coalesce(new.published_at,now());
  end if;
  return new;
end $$;
create trigger publish_completed_university before insert or update on public.institutions
for each row execute function public.publish_completed_university();

create function public.publish_university_content() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.is_published := true;
  return new;
end $$;
create trigger publish_course before insert or update on public.courses
for each row execute function public.publish_university_content();
create trigger publish_tour before insert or update on public.institution_tours
for each row execute function public.publish_university_content();

update public.courses set is_published=true where not is_published;
update public.institution_tours set is_published=true where not is_published;
-- Include universities that completed setup before this migration.
-- Removed, suspended, and rejected listings are not reinstated.
update public.institutions set verification_status='approved',published_at=coalesce(published_at,now())
where setup_completed_at is not null and removed_at is null and verification_status in ('pending','approved');

revoke all on function public.publish_completed_university(), public.publish_university_content() from public,anon,authenticated;
do $$
begin
  execute replace(pg_get_functiondef('public.submit_institution(jsonb)'::regprocedure),
    'Your institution is pending review. You can add courses and verification documents from your dashboard.',
    'Complete your university profile, courses, and gallery to publish automatically.');
end $$;

commit;
