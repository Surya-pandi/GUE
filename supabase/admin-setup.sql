-- Run in the Supabase SQL editor after migrations 001 through 009.
-- First register and verify the intended admin account normally.
-- Replace the email below with that account's exact email, then run this file.
-- This is a manual setup script, not an automatically applied migration.
begin;
do $$
declare
  admin_email text := 'REPLACE_WITH_VERIFIED_ADMIN_EMAIL';
  admin_id uuid;
begin
  if admin_email='REPLACE_WITH_VERIFIED_ADMIN_EMAIL' then
    raise exception 'Replace the placeholder with your verified admin account email.';
  end if;
  select id into strict admin_id from auth.users
    where lower(email)=lower(trim(admin_email)) and email_confirmed_at is not null;
  update public.profiles set role='super_admin',updated_at=now() where id=admin_id;
  if not found then raise exception 'Profile not found. Apply the migrations and register the account first.'; end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    values(admin_id,'admin_role_assigned','profile',admin_id,jsonb_build_object('source','manual SQL setup'));
exception
  when no_data_found then raise exception 'No verified user exists for this email. Register and verify it first.';
  when too_many_rows then raise exception 'Multiple accounts match this email. Select a specific verified user in the SQL editor.';
end $$;
commit;
