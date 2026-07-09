import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { getAppSettings } from '@/services/settingsService';

/** Club-wide settings (checkout URL, price label, paywall toggle, etc.). */
export function useAppSettings() {
  return useQuery({
    queryKey: queryKeys.settings.app(),
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000,
  });
}
