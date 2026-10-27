begin;

-- Serialize bookings for the same student, including the existing slot workflow.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.book_slot(text,uuid,text,integer)'::regprocedure);
  if position('perform public.throttle(''booking:''||auth.uid(),20,3600);' in definition)=0 then
    raise exception 'Booking workflow not found. Apply previous migrations first.';
  end if;
  execute replace(definition,
    'perform public.throttle(''booking:''||auth.uid(),20,3600);',
    'perform 1 from public.profiles where id=auth.uid() for update; perform public.throttle(''booking:''||auth.uid(),20,3600);');
end $$;

create function public.auto_book_counselling(institution uuid, requested_date date, notes text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.counselling_slots%rowtype; booking uuid; owner_id uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then
    raise exception 'A student account is required.';
  end if;
  if requested_date is null or requested_date < (now() at time zone 'Asia/Kolkata')::date
    or notes is null or length(notes)>2000 then
    raise exception 'Choose today or a future date and keep questions under 2000 characters.';
  end if;
  if not public.is_public(institution) then raise exception 'This university is unavailable.'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  perform public.throttle('booking:'||auth.uid(),20,3600);
  -- Lock candidates before checking occupancy, so simultaneous requests cannot
  -- reserve the same slot. Skip candidates another booking is processing.
  for s in select * from public.counselling_slots
    where institution_id=institution and status='open' and starts_at>now()
      and starts_at >= (requested_date::timestamp at time zone 'Asia/Kolkata')
      and starts_at < ((requested_date+1)::timestamp at time zone 'Asia/Kolkata')
    order by starts_at,id for update skip locked
  loop
    if exists(select 1 from public.counselling_bookings where slot_id=s.id
      and status in ('pending','confirmed','reschedule_requested')) then continue; end if;
    if exists(select 1 from public.counselling_bookings where student_id=auth.uid()
      and status in ('pending','confirmed','reschedule_requested')
      and tstzrange(starts_at,ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) then continue; end if;
    insert into public.counselling_bookings(student_id,institution_id,staff_user_id,slot_id,starts_at,ends_at,student_enquiry,status)
      values(auth.uid(),s.institution_id,s.staff_user_id,s.id,s.starts_at,s.ends_at,notes,'confirmed') returning id into booking;
    select owner_user_id into owner_id from public.institutions where id=institution;
    perform public.notify_user(auth.uid(),'Counselling scheduled','Your time is confirmed. View your dashboard for the schedule. The university will add the video meeting link.','booking',booking);
    perform public.notify_user(owner_id,'Counselling scheduled','A student has booked an available slot. Add the video meeting link in your counselling dashboard.','booking',booking);
    if s.staff_user_id<>owner_id then
      perform public.notify_user(s.staff_user_id,'Counselling scheduled','A student has booked your available slot. Add the video meeting link in your dashboard.','booking',booking);
    end if;
    insert into public.audit_logs(actor_user_id,action,entity_type,entity_id)
      values(auth.uid(),'auto_scheduled','counselling_booking',booking);
    return booking;
  end loop;
  raise exception 'No free counselling slots on this date that fit your schedule. Choose another date or try again shortly.';
end $$;
revoke all on function public.auto_book_counselling(uuid,date,text) from public,anon;
grant execute on function public.auto_book_counselling(uuid,date,text) to authenticated;
commit;
