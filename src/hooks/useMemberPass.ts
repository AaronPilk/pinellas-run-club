import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { getMyPass } from '@/services/memberPassService';

export function useMyPass() {
  return useQuery({
    queryKey: queryKeys.memberPass.mine(),
    queryFn: getMyPass,
  });
}
