begin;
create function public.throttle(bucket text, maximum integer, seconds integer) returns void language plpgsql security definer set search_path='' as $$ declare n integer; begin
 insert into public.rate_limits(key,hits,expires_at) values(bucket,1,now()+make_interval(secs=>seconds)) on conflict(key) do update set hits=case when public.rate_limits.expires_at<now() then 1 else public.rate_limits.hits+1 end, expires_at=case when public.rate_limits.expires_at<now() then now()+make_interval(secs=>seconds) else public.rate_limits.expires_at end returning hits into n;
 if n>maximum then raise exception 'Too many requests. Please try again later.'; end if; end $$;
create function public.notify_user(u uuid, title text, body text, kind text, entity uuid default null) returns void language plpgsql security definer set search_path='' as $$ declare n uuid; begin
 insert into public.notifications(user_id,title,message,notification_type,related_entity_id) values(u,title,body,kind,entity) returning id into n;
 insert into public.email_outbox(notification_id,recipient,subject,body) select n,a.email,title,body from auth.users a join public.profiles p on p.id=a.id where a.id=u and p.email_notifications;
 end $$;
create function public.book_slot(kind text, slot uuid, notes text default '', visitors integer default 1) returns uuid language plpgsql security definer set search_path='' as $$ declare s record; used integer; b uuid; owner_id uuid; begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then raise exception 'A student account is required.'; end if;
 if kind not in ('counselling','visit') or length(notes)>2000 or visitors not between 1 and 10 then raise exception 'Invalid booking.'; end if;
 perform public.throttle('booking:'||auth.uid(),20,3600);
 if kind='counselling' then
 select * into s from public.counselling_slots where id=slot for update;
 else select * into s from public.campus_visit_slots where id=slot for update; end if;
 if s.id is null or not public.is_public(s.institution_id) or s.status<>'open' or s.starts_at<=now() then raise exception 'This slot is no longer available.'; end if;
 if kind='counselling' then
 select count(*) into used from public.counselling_bookings where slot_id=slot and status in ('pending','confirmed','reschedule_requested');
 if used>=s.capacity then raise exception 'This slot has just been booked. Choose another time.'; end if;
 if exists(select 1 from public.counselling_bookings where student_id=auth.uid() and status in ('pending','confirmed','reschedule_requested') and tstzrange(starts_at,ends_at,'[)') && tstzrange(s.starts_at,s.ends_at,'[)')) then raise exception 'You already have a session at this time.'; end if;
 insert into public.counselling_bookings(student_id,institution_id,staff_user_id,slot_id,starts_at,ends_at,student_enquiry) values(auth.uid(),s.institution_id,s.staff_user_id,s.id,s.starts_at,s.ends_at,notes) returning id into b;
 else
 select coalesce(sum(visitor_count),0) into used from public.campus_visit_bookings where slot_id=slot and status in ('pending','confirmed','reschedule_requested');
 if used+visitors>s.capacity then raise exception 'There is not enough capacity for your group.'; end if;
 insert into public.campus_visit_bookings(student_id,institution_id,slot_id,visitor_count,student_notes) values(auth.uid(),s.institution_id,s.id,visitors,notes) returning id into b;
 end if;
 select owner_user_id into owner_id from public.institutions where id=s.institution_id;
 perform public.notify_user(auth.uid(),'Booking request received','Your '||kind||' request is pending institution confirmation.','booking',b);
 perform public.notify_user(owner_id,'New booking request','A student has requested a '||kind||' booking. Open your dashboard to review it.','booking',b);
 return b; end $$;

create function public.change_booking(kind text, booking uuid, decision text, response text default '', meeting text default '') returns void language plpgsql security definer set search_path='' as $$ declare b record; t text; starts timestamptz; deadline integer; manager boolean; begin
 if kind not in ('counselling','visit') or decision not in ('confirmed','rejected','cancelled','completed','no_show','reschedule_requested') or length(response)>2000 then raise exception 'Invalid request.'; end if;
 t:=case when kind='counselling' then 'counselling_bookings' else 'campus_visit_bookings' end;
 execute format('select * from public.%I where id=$1 for update',t) into b using booking;
 if b.id is null then raise exception 'Booking not found.'; end if;
 manager:=public.can_manage(b.institution_id,'bookings');
 if auth.uid() is null or (b.student_id<>auth.uid() and not manager) then raise exception 'Access denied.'; end if;
 if b.status not in ('pending','confirmed','reschedule_requested') then raise exception 'This booking is already closed.'; end if;
 if kind='counselling' then select starts_at into starts from public.counselling_slots where id=b.slot_id; else select starts_at into starts from public.campus_visit_slots where id=b.slot_id; end if;
 if not manager then
 select cancellation_hours into deadline from public.platform_settings where id;
 if decision not in ('cancelled','reschedule_requested') or starts<now()+make_interval(hours=>deadline) then raise exception 'Changes are closed for this booking. Contact the institution.'; end if;
 elsif decision in ('completed','no_show') and (starts>now() or b.status<>'confirmed') then raise exception 'Only a confirmed session that has started can be completed.';
 elsif decision='confirmed' and starts<=now() then raise exception 'This slot has already started.';
 end if;
 if kind='visit' and decision='no_show' then raise exception 'Invalid visit status.'; end if;
 if kind='counselling' and manager and decision='confirmed' then
 if meeting !~ '^https://(meet[.]google[.]com|zoom[.]us|teams[.]microsoft[.]com)/[^[:space:]]+$' then raise exception 'Provide an approved HTTPS meeting link.'; end if;
 update public.counselling_bookings set meeting_url=meeting,meeting_provider='external' where id=booking;
 end if;
 execute format('update public.%I set status=$1::public.booking_status,institution_response=case when $2 then $3 else institution_response end,updated_at=now() where id=$4',t) using decision,manager,response,booking;
 perform public.notify_user(b.student_id,'Booking '||replace(decision,'_',' '),'Your '||kind||' booking has been updated. View the details in your dashboard.','booking',booking);
 if not manager then perform public.notify_user((select owner_user_id from public.institutions where id=b.institution_id),'Student booking update','A student has cancelled or requested a different time. Review your dashboard.','booking',booking); end if;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id) values(auth.uid(),decision,t,booking);
 end $$;

create function public.submit_institution(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare i uuid; begin
 if auth.uid() is null then raise exception 'Please sign in first.'; end if;
 perform public.throttle('application:'||auth.uid(),3,86400);
 if length(payload->>'name') not between 3 and 180 or coalesce(payload->>'city','')='' or coalesce(payload->>'state','')='' or coalesce(payload->>'official_email','') !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Complete the required institution details.'; end if;
 insert into public.institutions(owner_user_id,name,slug,institution_type,official_email,phone,website_url,city,state,address,representative_name,representative_designation)
 values(auth.uid(),payload->>'name',lower(regexp_replace(payload->>'name','[^a-zA-Z0-9]+','-','g'))||'-'||substr(gen_random_uuid()::text,1,8),payload->>'institution_type',payload->>'official_email',coalesce(payload->>'phone',''),coalesce(payload->>'website_url',''),payload->>'city',payload->>'state',coalesce(payload->>'address',''),coalesce(payload->>'representative_name',''),coalesce(payload->>'representative_designation','')) returning id into i;
 update public.profiles set role='institution_owner' where id=auth.uid() and role='student';
 perform public.notify_user(auth.uid(),'Institution application received','Your institution is pending review. You can add courses and verification documents from your dashboard.','application',i);
 return i; end $$;

create function public.manage_record(operation text, payload jsonb) returns void language plpgsql security definer set search_path='' as $$ declare i uuid; r uuid; u uuid; st text; perms text[]; begin
 if auth.uid() is null then raise exception 'Please sign in.'; end if;
 perform public.throttle('manage:'||auth.uid(),180,3600);
 i:=nullif(payload->>'institution_id','')::uuid; r:=nullif(payload->>'id','')::uuid;
 if operation='profile' then
 update public.profiles set full_name=left(coalesce(payload->>'full_name',''),120),phone=left(coalesce(payload->>'phone',''),30),education_level=left(coalesce(payload->>'education_level',''),100),email_notifications=coalesce((payload->>'email_notifications')::boolean,true),updated_at=now() where id=auth.uid();
 insert into public.student_interests(student_id,preferred_streams,preferred_states,preferred_budget_max) values(auth.uid(),array(select jsonb_array_elements_text(coalesce(payload->'preferred_streams','[]'))),array(select jsonb_array_elements_text(coalesce(payload->'preferred_states','[]'))),nullif(payload->>'preferred_budget_max','')::numeric) on conflict(student_id) do update set preferred_streams=excluded.preferred_streams,preferred_states=excluded.preferred_states,preferred_budget_max=excluded.preferred_budget_max,updated_at=now();
 elsif operation='save' then
 if (not coalesce((payload->>'remove')::boolean,false) and not public.is_public(i)) or not exists(select 1 from public.profiles where id=auth.uid() and role='student') then raise exception 'A published college and student account are required.'; end if;
 if coalesce((payload->>'remove')::boolean,false) then delete from public.saved_institutions where student_id=auth.uid() and institution_id=i; else insert into public.saved_institutions(student_id,institution_id) values(auth.uid(),i) on conflict do nothing; end if;
 elsif operation='read_notification' then update public.notifications set read_at=now() where id=r and user_id=auth.uid();
 elsif operation='delete_account' then insert into public.account_deletion_requests(user_id) values(auth.uid()) on conflict do nothing;
 elsif operation='institution' then
 if not public.can_manage(i,'profile') then raise exception 'Access denied.'; end if;
 update public.institutions set name=payload->>'name',description=left(coalesce(payload->>'description',''),12000),city=payload->>'city',state=payload->>'state',address=coalesce(payload->>'address',''),phone=coalesce(payload->>'phone',''),website_url=coalesce(payload->>'website_url',''),facilities=array(select jsonb_array_elements_text(coalesce(payload->'facilities','[]'))),hostel_details=coalesce(payload->>'hostel_details',''),admission_process=coalesce(payload->>'admission_process',''),verification_status='pending',published_at=null,updated_at=now() where id=i;
 elsif operation='course' then
 if not public.can_manage(i,'courses') then raise exception 'Access denied.'; end if;
 if not exists(select 1 from public.course_categories where name=payload->>'stream' and enabled) or length(coalesce(payload->>'name','')) not between 2 and 180 then raise exception 'Choose a valid course and stream.'; end if;
 if r is not null and coalesce((payload->>'remove')::boolean,false) then delete from public.courses where id=r and institution_id=i;
 elsif r is not null then update public.courses set name=payload->>'name',stream=payload->>'stream',degree_type=coalesce(payload->>'degree_type',''),duration=coalesce(payload->>'duration',''),eligibility=coalesce(payload->>'eligibility',''),published_fee_amount=nullif(payload->>'published_fee_amount','')::numeric,description=coalesce(payload->>'description',''),is_published=false,updated_at=now() where id=r and institution_id=i;
 else insert into public.courses(institution_id,name,stream,degree_type,duration,eligibility,published_fee_amount,description,is_published) values(i,payload->>'name',payload->>'stream',coalesce(payload->>'degree_type',''),coalesce(payload->>'duration',''),coalesce(payload->>'eligibility',''),nullif(payload->>'published_fee_amount','')::numeric,coalesce(payload->>'description',''),false); end if;
 update public.institutions set verification_status='pending',published_at=null where id=i;
 elsif operation='slot' then
 if not public.can_manage(i,'bookings') then raise exception 'Access denied.'; end if;
 if (payload->>'starts_at')::timestamptz<=now() then raise exception 'Choose a future time.'; end if;
 if payload->>'kind'='counselling' then
 u:=coalesce(nullif(payload->>'staff_user_id','')::uuid,auth.uid());
 if not exists(select 1 from public.institutions where id=i and owner_user_id=u) and not exists(select 1 from public.institution_staff where institution_id=i and user_id=u and status='active' and 'bookings'=any(permissions)) then raise exception 'Choose an authorized representative.'; end if;
 insert into public.counselling_slots(institution_id,staff_user_id,starts_at,ends_at) values(i,u,(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz);
 elsif payload->>'kind'='visit' then insert into public.campus_visit_slots(institution_id,starts_at,ends_at,capacity) values(i,(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,(payload->>'capacity')::integer); else raise exception 'Invalid slot type.'; end if;
 elsif operation='close_slot' then
 if not public.can_manage(i,'bookings') then raise exception 'Access denied.'; end if;
 if payload->>'kind'='visit' then update public.campus_visit_slots set status='closed' where id=r and institution_id=i; else update public.counselling_slots set status='closed' where id=r and institution_id=i; end if;
 elsif operation='staff' then
 if not public.is_admin() and not exists(select 1 from public.institutions where id=i and owner_user_id=auth.uid()) then raise exception 'Only the institution owner can manage staff.'; end if;
 select id into u from auth.users where lower(email)=lower(payload->>'email'); if u is null then raise exception 'Ask this colleague to register an account first.'; end if;
 perms:=array(select jsonb_array_elements_text(coalesce(payload->'permissions','["bookings"]')));
 if not perms <@ array['profile','courses','media','documents','bookings','enquiries'] then raise exception 'Invalid permissions.'; end if;
 insert into public.institution_staff(institution_id,user_id,designation,permissions,status) values(i,u,coalesce(payload->>'designation',''),perms,coalesce(payload->>'status','active')) on conflict(institution_id,user_id) do update set permissions=excluded.permissions,status=excluded.status,designation=excluded.designation;
 update public.profiles set role='institution_staff' where id=u and role='student';
 elsif operation='verify' then
 if not public.is_admin() then raise exception 'Access denied.'; end if;
 st:=payload->>'status'; if st not in ('approved','rejected','suspended','pending') then raise exception 'Invalid decision.'; end if;
 update public.institutions set verification_status=st,verification_notes='',accreditation=coalesce(payload->>'accreditation',''),published_at=case when st='approved' then now() else null end,updated_at=now() where id=i returning owner_user_id into u;
 if st='approved' then update public.courses set is_published=true where institution_id=i; update public.institution_verification_documents set review_status='reviewed',reviewed_by=auth.uid(),reviewed_at=now() where institution_id=i; end if;
 insert into public.institution_reviews(institution_id,notes) values(i,left(coalesce(payload->>'notes',''),2000)) on conflict(institution_id) do update set notes=excluded.notes;
 perform public.notify_user(u,'Institution review: '||st,'The institution review has been updated. Sign in to read the review notes.','verification',i);
 elsif operation='category' then
 if not public.is_admin() then raise exception 'Access denied.'; end if;
 insert into public.course_categories(name,enabled) values(left(payload->>'name',100),coalesce((payload->>'enabled')::boolean,true)) on conflict(name) do update set enabled=excluded.enabled;
 elsif operation='settings' then
 if not public.is_admin() then raise exception 'Access denied.'; end if;
 update public.platform_settings set cancellation_hours=(payload->>'cancellation_hours')::integer,retention_days=(payload->>'retention_days')::integer where id;
 elsif operation='enquiry_status' then
 update public.contact_enquiries set status='resolved' where id=r and (public.is_admin() or public.can_manage(institution_id,'enquiries'));
 elsif operation='tour' then
 if not public.can_manage(i,'media') or coalesce(payload->>'tour_url','') !~ '^https://(www[.]google[.]com|maps[.]google[.]com|www[.]youtube[.]com|youtu[.]be|my[.]matterport[.]com)/[^[:space:]]+$' then raise exception 'An approved tour URL and media access are required.'; end if;
 insert into public.institution_tours(institution_id,tour_url,title) values(i,payload->>'tour_url',left(payload->>'title',200));
 else raise exception 'Unknown operation.'; end if;
 if operation not in ('profile','save','read_notification') then insert into public.audit_logs(actor_user_id,action,entity_type,entity_id) values(auth.uid(),operation,'workflow',coalesce(i,r)); end if;
 end $$;

create function public.submit_enquiry(payload jsonb) returns void language plpgsql security definer set search_path='' as $$ declare i uuid; recipient_id uuid; begin
 if auth.uid() is null then raise exception 'Please sign in to send an enquiry.'; end if;
 perform public.throttle('contact:'||auth.uid(),5,3600);
 if length(coalesce(payload->>'message','')) not between 10 and 4000 or length(coalesce(payload->>'subject','')) not between 3 and 180 then raise exception 'Check your subject and message.'; end if;
 i:=nullif(payload->>'institution_id','')::uuid; if i is not null and not public.is_public(i) then raise exception 'Institution unavailable.'; end if;
 insert into public.contact_enquiries(name,email,subject,message,institution_id,student_id) select p.full_name,a.email,payload->>'subject',payload->>'message',i,auth.uid() from public.profiles p join auth.users a on a.id=p.id where p.id=auth.uid();
 if i is not null then select owner_user_id into recipient_id from public.institutions where id=i; perform public.notify_user(recipient_id,'New student enquiry','A student has sent an enquiry. View it in your dashboard.','enquiry',i);
 else for recipient_id in select id from public.profiles where role='super_admin' loop perform public.notify_user(recipient_id,'New contact enquiry','A contact enquiry is waiting in the dashboard.','enquiry'); end loop; end if;
 end $$;

create function public.claim_emails() returns setof public.email_outbox language sql security definer set search_path='' as $$ update public.email_outbox set locked_until=now()+interval '5 minutes',attempts=attempts+1 where id in(select id from public.email_outbox where sent_at is null and attempts<8 and available_at<=now() and (locked_until is null or locked_until<now()) order by created_at for update skip locked limit 20) returning * $$;

-- SECURITY DEFINER helpers are callable only through the intended entry points.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin(),public.can_manage(uuid,text),public.is_public(uuid) to anon,authenticated;
grant execute on function public.book_slot(text,uuid,text,integer),public.change_booking(text,uuid,text,text,text),public.submit_institution(jsonb),public.manage_record(text,jsonb),public.submit_enquiry(jsonb) to authenticated;
grant execute on function public.claim_emails() to service_role;
grant all on public.email_outbox to service_role;
commit;
