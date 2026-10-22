insert into public.profiles (id, role)
values ('YOUR-USER-UUID'::uuid, 'super_admin')
on conflict (id)
do update set role = 'super_admin', updated_at = now();