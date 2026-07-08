import { supabase } from '@/lib/supabase';
import { uploadToBucket } from '@/services/mediaService';
import type { MemberBadgeWithBadge, MemberProfile, MemberStats, Profile } from '@/types/models';

let cachedProfileId: string | null = null;

/** Clear the cached profile id (call on sign out / auth change). */
export function clearProfileCache(): void {
  cachedProfileId = null;
}

/**
 * The current user's profiles.id (NOT the auth uid). Cached per session.
 * Throws if there is no signed-in user or no profile row.
 */
export async function getCurrentProfileId(): Promise<string> {
  if (cachedProfileId) return cachedProfileId;

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  cachedProfileId = (data as { id: string }).id;
  return cachedProfileId;
}

/** Full profile row for the signed-in user, or null if none exists yet. */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'username'
    | 'phone'
    | 'avatar_url'
    | 'bio'
    | 'instagram_handle'
    | 'favorite_run_spot'
    | 'running_level'
    | 'typical_pace'
    | 'favorite_distance'
    | 'interests'
    | 'allow_public_stats'
    | 'notification_events'
    | 'notification_perks'
    | 'notification_social'
    | 'notification_badges'
  >
>;

export async function updateMyProfile(updates: ProfileUpdate): Promise<Profile> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}

/** Another member's public profile + stats + badges. */
export async function getMemberProfile(profileId: string): Promise<MemberProfile> {
  const [{ data: profile, error: profileError }, { data: stats, error: statsError }, { data: badges, error: badgesError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).is('deleted_at', null).single(),
      supabase.from('member_stats').select('*').eq('profile_id', profileId).maybeSingle(),
      supabase
        .from('member_badges')
        .select('*, badge:badges(*)')
        .eq('profile_id', profileId)
        .order('awarded_at', { ascending: false }),
    ]);

  if (profileError) throw profileError;
  if (statsError) throw statsError;
  if (badgesError) throw badgesError;

  return {
    profile: profile as Profile,
    stats: (stats as MemberStats | null) ?? null,
    badges: (badges ?? []) as unknown as MemberBadgeWithBadge[],
  };
}

/**
 * Compress + upload an avatar image, set profiles.avatar_url, return the URL.
 */
export async function uploadAvatar(localUri: string): Promise<string> {
  const profileId = await getCurrentProfileId();
  const path = `${profileId}/avatar-${Date.now()}.jpg`;
  const publicUrl = await uploadToBucket({ bucket: 'avatars', path, uri: localUri });

  await updateMyProfile({ avatar_url: publicUrl });
  return publicUrl;
}
