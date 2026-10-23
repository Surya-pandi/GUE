begin;

-- Gallery photos no longer need individual approval. University publication
-- still controls discovery; documents remain private.
create function public.auto_publish_gallery_photo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.is_published := true;
  return new;
end $$;
create trigger auto_publish_gallery_photo before insert on public.university_media
for each row execute function public.auto_publish_gallery_photo();

create function public.set_initial_gallery_cover() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.institutions set cover_image_path=new.storage_path
    where id=new.institution_id and cover_image_path is null;
  return new;
end $$;
create trigger set_initial_gallery_cover after insert on public.university_media
for each row execute function public.set_initial_gallery_cover();

update public.university_media set is_published=true where not is_published;
update public.institutions i set cover_image_path=(
  select m.storage_path from public.university_media m where m.institution_id=i.id
  order by m.created_at,m.id limit 1
) where cover_image_path is null;

-- Serve existing and new photos from their original bucket, without moving
-- or making confidential documents public.
create function public.can_read_gallery_photo(path text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.university_media m
    where m.storage_path=path and m.is_published and public.is_public(m.institution_id));
$$;
create policy published_gallery_read on storage.objects for select to authenticated
using(bucket_id='institution-private-documents' and public.can_read_gallery_photo(name));

revoke all on function public.auto_publish_gallery_photo(), public.set_initial_gallery_cover(), public.can_read_gallery_photo(text) from public,anon;
grant execute on function public.can_read_gallery_photo(text) to authenticated;
commit;
