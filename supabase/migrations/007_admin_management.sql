begin;

alter table public.institutions add column removed_at timestamptz;
create index institutions_removed on public.institutions(removed_at) where removed_at is not null;

-- An archived listing cannot be republished by another management workflow.
alter table public.institutions add constraint removed_not_published
  check (removed_at is null or (published_at is null and verification_status <> 'approved'));

create or replace function public.is_public(i uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.institutions
    where id=i and verification_status='approved' and published_at is not null and removed_at is null)
$$;

create function public.admin_listing_action(institution uuid, operation text, reason text)
returns void language plpgsql security definer set search_path='' as $$
declare current_record public.institutions%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Access denied.'; end if;
  if operation is null or operation not in ('remove','restore') then raise exception 'Unknown listing action.'; end if;
  if reason is null or length(trim(reason)) < 5 or length(reason) > 1000 then raise exception 'A reason between 5 and 1000 characters is required.'; end if;
  select * into current_record from public.institutions where id=institution for update;
  if not found then raise exception 'University not found.'; end if;
  if operation='remove' then
    if current_record.removed_at is not null then raise exception 'This university has already been removed.'; end if;
    update public.institutions set removed_at=now(), verification_status='suspended', published_at=null, updated_at=now() where id=institution;
  else
    if current_record.removed_at is null then raise exception 'This university is not removed.'; end if;
    update public.institutions set removed_at=null, verification_status='pending', published_at=null, updated_at=now() where id=institution;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'institution_' || operation,'institution',institution,
      jsonb_build_object('reason',trim(reason),'name',current_record.name,'previous_status',current_record.verification_status));
end $$;
revoke all on function public.admin_listing_action(uuid,text,text) from public,anon;
grant execute on function public.admin_listing_action(uuid,text,text) to authenticated;
commit;
