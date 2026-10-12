begin;
-- Protect active representative reservations even if a slot is later closed.
alter table public.counselling_bookings add constraint representative_booking_overlap exclude using gist(staff_user_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed','reschedule_requested'));
alter table public.counselling_bookings add constraint student_booking_overlap exclude using gist(student_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed','reschedule_requested'));
-- Private administrative notes live behind institution-management access.
create table public.institution_reviews(institution_id uuid primary key references public.institutions on delete cascade,notes text not null default '');
alter table public.institution_reviews enable row level security;
revoke all on public.institution_reviews from anon,authenticated;
grant select on public.institution_reviews to authenticated;
create policy reviews_read on public.institution_reviews for select to authenticated using(public.can_manage(institution_id));
-- Review outcomes are visible only to administrators and the authorized institution team.
create index on public.audit_logs(created_at desc);
create index on public.account_deletion_requests(status);
commit;
