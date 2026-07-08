import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import {
  checkInGps,
  checkInQr,
  getCurrentCheckinableEvent,
  getMyStats,
  listMyCheckins,
} from '@/services/checkinService';

export function useCurrentCheckinableEvent() {
  return useQuery({
    queryKey: queryKeys.checkins.current(),
    queryFn: getCurrentCheckinableEvent,
    // Check-in windows move; keep this fresh.
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useMyCheckins() {
  return useQuery({
    queryKey: queryKeys.checkins.history(),
    queryFn: () => listMyCheckins(),
  });
}

export function useCheckinStats() {
  return useQuery({
    queryKey: queryKeys.checkins.stats(),
    queryFn: getMyStats,
  });
}

function useInvalidateAfterCheckin() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.checkins.all });
    qc.invalidateQueries({ queryKey: queryKeys.events.all });
    qc.invalidateQueries({ queryKey: queryKeys.badges.all });
    qc.invalidateQueries({ queryKey: queryKeys.profile.all });
  };
}

/** GPS check-in. Location capture happens inside the service. */
export function useCheckInGps() {
  const invalidate = useInvalidateAfterCheckin();

  return useMutation({
    mutationFn: (eventId: string) => checkInGps(eventId),
    onSuccess: invalidate,
  });
}

/** QR check-in with a scanned nonce. */
export function useCheckInQr() {
  const invalidate = useInvalidateAfterCheckin();

  return useMutation({
    mutationFn: ({ eventId, nonce }: { eventId: string; nonce: string }) =>
      checkInQr(eventId, nonce),
    onSuccess: invalidate,
  });
}
