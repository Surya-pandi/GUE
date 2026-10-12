begin;
create function public.can_read_private_object(path text) returns boolean language plpgsql stable security definer set search_path='' as $$ declare i uuid; kind text; begin
 begin i:=split_part(path,'/',1)::uuid;exception when invalid_text_representation then return false;end;
 kind:=split_part(path,'/',2);
 return case when kind='media' then public.can_manage(i,'media') when kind='document' then public.can_manage(i,'documents') else false end;
 end $$;
create function public.can_upload_private_object(path text) returns boolean language plpgsql security definer set search_path='' as $$ declare i uuid; total integer; begin
 if not public.can_read_private_object(path) then return false;end if;
 i:=split_part(path,'/',1)::uuid;
 -- Serialize the institution quota even for direct Storage API clients.
 perform pg_advisory_xact_lock(hashtextextended(i::text,71));
 select count(*) into total from storage.objects where bucket_id='institution-private-documents' and split_part(name,'/',1)=i::text;
 if total>=100 then raise exception 'Institution upload quota reached.';end if;
 perform public.throttle('storage:'||auth.uid(),60,86400);
 return true;
 end $$;
drop policy private_upload on storage.objects;
drop policy private_read on storage.objects;
create policy private_upload on storage.objects for insert to authenticated with check(bucket_id='institution-private-documents' and public.can_upload_private_object(name));
create policy private_read on storage.objects for select to authenticated using(bucket_id='institution-private-documents' and public.can_read_private_object(name));
revoke execute on function public.can_read_private_object(text),public.can_upload_private_object(text) from public,anon;
grant execute on function public.can_read_private_object(text),public.can_upload_private_object(text) to authenticated;
commit;
