begin;
-- Include published program names in the institution search document.
alter table public.institutions add column course_search text not null default '';
drop index public.institution_search;
alter table public.institutions drop column search_document;
alter table public.institutions add column search_document tsvector generated always as (to_tsvector('english',name||' '||city||' '||state||' '||description||' '||course_search)) stored;
create index institution_search on public.institutions using gin(search_document);
create function public.sync_course_search() returns trigger language plpgsql security definer set search_path='' as $$ declare i uuid; begin
 i:=case when tg_op='DELETE' then old.institution_id else new.institution_id end;
 update public.institutions set course_search=coalesce((select string_agg(name||' '||stream,' ') from public.courses where institution_id=i and is_published),'') where id=i;
 return coalesce(new,old); end $$;
create trigger course_search_sync after insert or update or delete on public.courses for each row execute function public.sync_course_search();
-- A staff member needs to see their institution even when profile editing is not permitted.
create function public.is_member(i uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.institution_staff where institution_id=i and user_id=auth.uid() and status='active')$$;
drop policy institution_read on public.institutions;
create policy institution_read on public.institutions for select using(public.is_public(id) or public.can_manage(id) or public.is_member(id));
create table public.booking_reminders(booking_id uuid not null,kind text not null,created_at timestamptz not null default now(),primary key(booking_id,kind));
alter table public.booking_reminders enable row level security;
revoke all on public.booking_reminders from anon,authenticated;
create function public.queue_reminders() returns integer language plpgsql security definer set search_path='' as $$declare b record; inserted integer; total integer:=0; begin
 for b in select id,student_id,'counselling'::text kind,starts_at from public.counselling_bookings where status='confirmed' and starts_at between now() and now()+interval '24 hours'
 union all select v.id,v.student_id,'visit',s.starts_at from public.campus_visit_bookings v join public.campus_visit_slots s on s.id=v.slot_id where v.status='confirmed' and s.starts_at between now() and now()+interval '24 hours' loop
 insert into public.booking_reminders(booking_id,kind) values(b.id,b.kind) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted>0 then perform public.notify_user(b.student_id,'Your booking is coming up','Your confirmed '||b.kind||' booking is within the next 24 hours. Check your dashboard for the local time and details.','reminder',b.id);total:=total+1;end if;
 end loop;return total;end $$;
revoke execute on function public.sync_course_search(),public.queue_reminders(),public.is_member(uuid) from public,anon,authenticated;
grant execute on function public.is_member(uuid) to anon,authenticated;
grant execute on function public.queue_reminders() to service_role;
commit;
