import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { clearProfileCache, getMyProfile } from '@/services/profileService';
import type { Profile } from '@/types/models';

export type AuthContextValue = {
  session: Session | null;
  /** The signed-in member's profile row (null while signed out / loading). */
  profile: Profile | null;
  /** True until the initial session + profile load resolves. */
  loading: boolean;
  userId: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isSuspended: boolean;
  refetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const next = await getMyProfile();
      setProfile(next);
    } catch (error) {
      if (__DEV__) console.warn('[auth] failed to load profile', error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        if (data.session) await loadProfile();
        if (mounted) setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession) {
        void loadProfile().finally(() => setLoading(false));
      } else {
        clearProfileCache();
        setProfile(null);
        queryClient.clear();
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearProfileCache();
    setProfile(null);
    queryClient.clear();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role;
    const status = profile?.status;

    return {
      session,
      profile,
      loading,
      userId: session?.user?.id ?? null,
      isAdmin: role === 'admin' || role === 'super_admin',
      isSuperAdmin: role === 'super_admin',
      isApproved: status === 'approved',
      isPending: status === 'pending',
      isSuspended: status === 'suspended' || status === 'rejected',
      refetchProfile: loadProfile,
      signOut,
    };
  }, [session, profile, loading, loadProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
