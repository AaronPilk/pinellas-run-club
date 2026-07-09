import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types/models';

/** The single app_settings row (id = 1). Readable by any authenticated member. */
export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return (data as AppSettings | null) ?? null;
}
