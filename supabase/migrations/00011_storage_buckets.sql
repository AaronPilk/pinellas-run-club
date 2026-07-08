-- Pinellas Run Club — storage buckets and object policies
-- Buckets: avatars, feed-media, event-images, partner-images, course-images
-- Public read for MVP (buckets marked public; authenticated can also list).
-- Writes: users own their avatar/feed-media folders; admins own the rest.
--
-- Folder conventions:
--   avatars/{profileId}/avatar.jpg
--   feed-media/{profileId}/{postId}/{uuid}.jpg
--   event-images/{eventId}/{uuid}.jpg
--   partner-images/{partnerId}/{uuid}.jpg
--   course-images/{courseId}/{uuid}.jpg

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('feed-media', 'feed-media', true),
  ('event-images', 'event-images', true),
  ('partner-images', 'partner-images', true),
  ('course-images', 'course-images', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Read: any authenticated user can read/list objects in club buckets
-- ---------------------------------------------------------------------------
drop policy if exists "club_buckets_read" on storage.objects;
create policy "club_buckets_read"
on storage.objects
for select
to authenticated
using (bucket_id in ('avatars', 'feed-media', 'event-images', 'partner-images', 'course-images'));

-- ---------------------------------------------------------------------------
-- avatars: users write inside their own folder (profile id or auth uid)
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (public.current_profile_id()::text, auth.uid()::text)
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (public.current_profile_id()::text, auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (public.current_profile_id()::text, auth.uid()::text)
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (public.current_profile_id()::text, auth.uid()::text)
);

-- ---------------------------------------------------------------------------
-- feed-media: approved members write inside their own profile folder
-- ---------------------------------------------------------------------------
drop policy if exists "post_media_insert_own" on storage.objects;
create policy "post_media_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'feed-media'
  and public.is_approved()
  and (storage.foldername(name))[1] = public.current_profile_id()::text
);

drop policy if exists "post_media_delete_own_or_admin" on storage.objects;
create policy "post_media_delete_own_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'feed-media'
  and (
    (storage.foldername(name))[1] = public.current_profile_id()::text
    or public.is_admin()
  )
);

-- ---------------------------------------------------------------------------
-- event-images / partner-images / course-images: admin-managed
-- ---------------------------------------------------------------------------
drop policy if exists "admin_buckets_insert" on storage.objects;
create policy "admin_buckets_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('event-images', 'partner-images', 'course-images')
  and public.is_admin()
);

drop policy if exists "admin_buckets_update" on storage.objects;
create policy "admin_buckets_update"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('event-images', 'partner-images', 'course-images')
  and public.is_admin()
)
with check (
  bucket_id in ('event-images', 'partner-images', 'course-images')
  and public.is_admin()
);

drop policy if exists "admin_buckets_delete" on storage.objects;
create policy "admin_buckets_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('event-images', 'partner-images', 'course-images')
  and public.is_admin()
);
