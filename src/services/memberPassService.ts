import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type { MemberPass } from '@/types/models';

/** The current member's pass (created automatically at signup). */
export async function getMyPass(): Promise<MemberPass | null> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('member_passes')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return (data as MemberPass | null) ?? null;
}
