begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('institution-public-media','institution-public-media',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('institution-private-documents','institution-private-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']),
 ('user-avatars','user-avatars',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy private_upload on storage.objects for insert to authenticated with check(bucket_id='institution-private-documents' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.can_manage(((storage.foldername(name))[1])::uuid,'documents'));
create policy private_read on storage.objects for select to authenticated using(bucket_id='institution-private-documents' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.can_manage(((storage.foldername(name))[1])::uuid,'documents'));
create policy private_cleanup on storage.objects for delete to authenticated using(bucket_id='institution-private-documents' and public.is_admin());
create policy public_upload on storage.objects for insert to authenticated with check(bucket_id='institution-public-media' and public.is_admin());
create policy public_delete on storage.objects for delete to authenticated using(bucket_id='institution-public-media' and public.is_admin());
create policy public_media_read on storage.objects for select using(bucket_id='institution-public-media');
create policy avatar_read on storage.objects for select to authenticated using(bucket_id='user-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy avatar_insert on storage.objects for insert to authenticated with check(bucket_id='user-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create function public.record_upload(institution uuid, path text, kind text, label text) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.can_manage(institution,case when kind='media' then 'media' else 'documents' end) or split_part(path,'/',1)<>institution::text or split_part(path,'/',2)<>kind or not exists(select 1 from storage.objects where bucket_id='institution-private-documents' and name=path) then raise exception 'Upload not authorized.'; end if;
 perform public.throttle('upload:'||auth.uid(),30,86400);
 if length(label) not between 3 and 500 then raise exception 'Provide a descriptive label.'; end if;
 if kind='document' then insert into public.institution_verification_documents(institution_id,storage_path,document_type) values(institution,path,label);
 elsif kind='media' then insert into public.college_media(institution_id,storage_path,alt_text) values(institution,path,label);
 else raise exception 'Invalid upload kind.'; end if;
 end $$;
create function public.approve_asset(kind text, asset uuid, cover boolean default false) returns void language plpgsql security definer set search_path='' as $$ declare i uuid; p text; begin
 if not public.is_admin() then raise exception 'Access denied.'; end if;
 if kind='media' then
 select institution_id,storage_path into i,p from public.college_media where id=asset;
 if not exists(select 1 from storage.objects where bucket_id='institution-public-media' and name=p) then raise exception 'Copy the approved image to public storage first.'; end if;
 update public.college_media set is_published=true where id=asset;
 if cover then update public.institutions set cover_image_path=p where id=i; end if;
 elsif kind='tour' then update public.institution_tours set is_published=true where id=asset returning institution_id into i;
 else raise exception 'Invalid asset type.'; end if;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id) values(auth.uid(),'approve_asset',kind,asset);
 end $$;
create function public.booking_report(filters jsonb) returns table(kind text,status text,total bigint) language plpgsql stable security definer set search_path='' as $$ declare i uuid; begin
 i:=nullif(filters->>'institution_id','')::uuid;
 if not public.is_admin() and (i is null or not public.can_manage(i,'bookings')) then raise exception 'Report access denied.'; end if;
 return query select all_b.kind,all_b.status::text,count(*) from (
 select 'counselling'::text as kind,b.status,b.institution_id,b.created_at from public.counselling_bookings b union all select 'visit',b.status,b.institution_id,b.created_at from public.campus_visit_bookings b
 ) all_b join public.institutions inst on inst.id=all_b.institution_id
 where (i is null or all_b.institution_id=i)
 and all_b.created_at>=coalesce(nullif(filters->>'from','')::date,current_date-30)::timestamp at time zone 'UTC'
 and all_b.created_at<(coalesce(nullif(filters->>'to','')::date,current_date)+1)::timestamp at time zone 'UTC'
 and (coalesce(filters->>'state','')='' or inst.state ilike filters->>'state')
 and (coalesce(filters->>'city','')='' or inst.city ilike filters->>'city')
 and (coalesce(filters->>'status','')='' or all_b.status::text=filters->>'status')
 group by all_b.kind,all_b.status;
 end $$;
revoke execute on function public.record_upload(uuid,text,text,text),public.approve_asset(text,uuid,boolean),public.booking_report(jsonb) from public,anon;
grant execute on function public.record_upload(uuid,text,text,text),public.approve_asset(text,uuid,boolean),public.booking_report(jsonb) to authenticated;
commit;
