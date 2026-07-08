import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { getPartner, listActivePartners, submitSponsorLead } from '@/services/partnersService';
import type { SponsorLeadInput } from '@/lib/validation';

export function usePartners() {
  return useQuery({
    queryKey: queryKeys.partners.list(),
    queryFn: listActivePartners,
  });
}

export function usePartner(partnerId: string) {
  return useQuery({
    queryKey: queryKeys.partners.detail(partnerId),
    queryFn: () => getPartner(partnerId),
    enabled: Boolean(partnerId),
  });
}

export function useSubmitSponsorLead() {
  return useMutation({
    mutationFn: (input: SponsorLeadInput) => submitSponsorLead(input),
  });
}
