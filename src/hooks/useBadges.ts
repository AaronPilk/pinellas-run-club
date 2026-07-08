import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { listAllBadges, listMyBadges } from '@/services/badgesService';

export function useMyBadges() {
  return useQuery({
    queryKey: queryKeys.badges.mine(),
    queryFn: listMyBadges,
  });
}

export function useAllBadges() {
  return useQuery({
    queryKey: queryKeys.badges.catalog(),
    queryFn: listAllBadges,
  });
}
