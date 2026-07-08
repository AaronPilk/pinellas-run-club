import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import {
  getEvent,
  listAttendees,
  listMyEvents,
  listPastEvents,
  listUpcomingEvents,
  rsvpEvent,
} from '@/services/eventsService';
import type { RsvpStatus } from '@/types/models';

export function useUpcomingEvents() {
  return useQuery({
    queryKey: queryKeys.events.upcoming(),
    queryFn: listUpcomingEvents,
  });
}

export function usePastEvents() {
  return useQuery({
    queryKey: queryKeys.events.past(),
    queryFn: () => listPastEvents(),
  });
}

export function useMyEvents() {
  return useQuery({
    queryKey: queryKeys.events.mine(),
    queryFn: listMyEvents,
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => getEvent(eventId),
    enabled: Boolean(eventId),
  });
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: queryKeys.events.attendees(eventId),
    queryFn: () => listAttendees(eventId),
    enabled: Boolean(eventId),
  });
}

/** RSVP mutation — invalidates all event queries on success. */
export function useRsvp(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (status: RsvpStatus) => rsvpEvent(eventId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}
