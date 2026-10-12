begin;

-- Keep a durable retry record if Storage is unavailable after a database deletion.
create table public.admin_storage_cleanup (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check(bucket in ('institution-private-documents','institution-public-media','user-avatars')),
  path text not null,
  created_at timestamptz not null default now(),
  unique(bucket,path)
);
alter table public.admin_storage_cleanup enable row level security;
revoke all on public.admin_storage_cleanup from anon,authenticated;
grant select,delete on public.admin_storage_cleanup to authenticated;
create policy cleanup_admin_read on public.admin_storage_cleanup for select to authenticated using(public.is_admin());
create policy cleanup_admin_delete on public.admin_storage_cleanup for delete to authenticated using(public.is_admin());
create policy admin_private_cleanup_read on storage.objects for select to authenticated using(public.is_admin() and bucket_id in ('institution-private-documents','user-avatars'));
create policy admin_avatar_cleanup on storage.objects for delete to authenticated using(public.is_admin() and bucket_id='user-avatars');

create function public.admin_delete_record(target_kind text, target_id uuid, reason text, confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare target_name text; target_role public.app_role; owner_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Access denied.'; end if;
  if confirmation is distinct from 'DELETE' then raise exception 'Type DELETE to confirm permanent deletion.'; end if;
  if reason is null or length(trim(reason)) < 5 or length(reason) > 1000 then raise exception 'A reason between 5 and 1000 characters is required.'; end if;
  if target_kind='institution' then
    select name,owner_user_id into target_name,owner_id from public.institutions where id=target_id for update;
    if not found then raise exception 'University not found.'; end if;
    -- Storage metadata is read here; actual files are removed through the Storage API.
    insert into public.admin_storage_cleanup(bucket,path)
      select bucket_id,name from storage.objects where bucket_id in ('institution-private-documents','institution-public-media') and split_part(name,'/',1)=target_id::text
      on conflict do nothing;
    delete from public.notifications where related_entity_id=target_id or
      related_entity_id in(select id from public.counselling_bookings where institution_id=target_id) or
      related_entity_id in(select id from public.campus_visit_bookings where institution_id=target_id);
    delete from public.contact_enquiries where institution_id=target_id;
    delete from public.counselling_bookings where institution_id=target_id;
    delete from public.campus_visit_bookings where institution_id=target_id;
    delete from public.institutions where id=target_id;
    -- A former owner keeps their account and can submit a new institution later.
    update public.profiles set role=case
      when exists(select 1 from public.institution_staff where user_id=owner_id and status='active') then 'institution_staff'::public.app_role
      else 'student'::public.app_role end
      where id=owner_id and role='institution_owner' and not exists(select 1 from public.institutions where owner_user_id=owner_id);
  elsif target_kind='student' then
    select full_name,role into target_name,target_role from public.profiles where id=target_id for update;
    if not found then raise exception 'Student not found.'; end if;
    if target_id=auth.uid() or target_role <> 'student' then raise exception 'Only student accounts can be deleted here. Administrator and institution accounts are protected.'; end if;
    if exists(select 1 from public.institutions where owner_user_id=target_id)
       or exists(select 1 from public.counselling_slots where staff_user_id=target_id)
       or exists(select 1 from public.counselling_bookings where staff_user_id=target_id)
       or exists(select 1 from public.institution_verification_documents where reviewed_by=target_id)
    then raise exception 'This account has institution responsibilities and cannot be deleted as a student.'; end if;
    insert into public.admin_storage_cleanup(bucket,path)
      select bucket_id,name from storage.objects where bucket_id='user-avatars' and split_part(name,'/',1)=target_id::text
      on conflict do nothing;
    delete from public.notifications where related_entity_id in(select id from public.counselling_bookings where student_id=target_id)
      or related_entity_id in(select id from public.campus_visit_bookings where student_id=target_id);
    delete from public.contact_enquiries where student_id=target_id;
    delete from public.counselling_bookings where student_id=target_id;
    delete from public.campus_visit_bookings where student_id=target_id;
    delete from public.account_deletion_requests where user_id=target_id;
    update public.audit_logs set actor_user_id=null where actor_user_id=target_id;
    -- Auth-owned dependent rows and the application profile cascade atomically.
    delete from auth.users where id=target_id;
  else raise exception 'Unknown deletion target.';
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),target_kind || '_permanently_deleted',target_kind,target_id,
      jsonb_build_object('reason',trim(reason),'name',target_name));
end $$;
revoke all on function public.admin_delete_record(text,uuid,text,text) from public,anon;
grant execute on function public.admin_delete_record(text,uuid,text,text) to authenticated;
commit;
