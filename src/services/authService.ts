import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { SignUpInput } from '@/lib/validation';

/**
 * Sign up with email/password. Profile metadata is passed via user metadata —
 * the `handle_new_user` Postgres trigger creates the profiles row from it.
 */
export async function signUp(input: SignUpInput): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        instagram_handle: input.instagramHandle?.trim() || null,
        favorite_run_spot: input.favoriteRunSpot?.trim() || null,
        running_level: input.runningLevel || null,
        typical_pace: input.typicalPace || null,
        invite_code: input.inviteCode?.trim() || null,
      },
    },
  });

  if (error) throw error;
  return data.session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
