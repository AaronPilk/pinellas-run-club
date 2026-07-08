import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type { Badge, MemberBadgeWithBadge } from '@/types/models';

/** All active badges (for the "locked/unlocked" grid). */
export async function listAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Badge[];
}

/** Badges the current member has earned, newest first. */
export async function listMyBadges(): Promise<MemberBadgeWithBadge[]> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('member_badges')
    .select('*, badge:badges(*)')
    .eq('profile_id', profileId)
    .order('awarded_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as MemberBadgeWithBadge[];
}
