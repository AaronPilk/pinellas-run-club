import * as Location from 'expo-location';

import { copy } from '@/lib/copy';
import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type { CheckinWithEvent, EventWithRsvp, MemberStats } from '@/types/models';
import { listUpcomingEvents, listPastEvents } from '@/services/eventsService';

/**
 * The event a member can check in to right now: today's published event whose
 * check-in window is open (or opening soon). Returns null when nothing is live.
 */
export async function getCurrentCheckinableEvent(): Promise<EventWithRsvp | null> {
  const now = Date.now();
  const windowPadMs = 6 * 60 * 60 * 1000; // show events starting within 6 hours

  const [upcoming, recent] = await Promise.all([listUpcomingEvents(), listPastEvents(3)]);
  const candidates = [...recent.reverse(), ...upcoming];

  for (const event of candidates) {
    const opens = event.checkin_opens_at ? Date.parse(event.checkin_opens_at) : Date.parse(event.starts_at) - 60 * 60 * 1000;
    const closes = event.checkin_closes_at
      ? Date.parse(event.checkin_closes_at)
      : (event.ends_at ? Date.parse(event.ends_at) : Date.parse(event.starts_at) + 3 * 60 * 60 * 1000);

    if (now >= opens && now <= closes) return event;
    if (opens > now && opens - now <= windowPadMs && event.status === 'published') return event;
  }

  return null;
}

/**
 * GPS check-in. Grabs the device location and hands it to the server RPC.
 * All validation (distance, window, duplicates, points) happens server-side.
 */
export async function checkInGps(eventId: string): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(copy.errors.locationDenied);
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { error } = await supabase.rpc('check_in_event_gps', {
    p_event_id: eventId,
    p_latitude: location.coords.latitude,
    p_longitude: location.coords.longitude,
  });

  if (error) throw error;
}

/** QR check-in: nonce comes from the scanned admin QR code. */
export async function checkInQr(eventId: string, nonce: string): Promise<void> {
  const { error } = await supabase.rpc('check_in_event_qr', {
    p_event_id: eventId,
    p_nonce: nonce,
  });

  if (error) throw error;
}

/** My check-in history, newest first. */
export async function listMyCheckins(limit = 50): Promise<CheckinWithEvent[]> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('event_checkins')
    .select('*, event:events(id, title, starts_at, location_name, event_type)')
    .eq('profile_id', profileId)
    .order('checked_in_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as CheckinWithEvent[];
}

/** My aggregate stats row (points, streaks, totals). */
export async function getMyStats(): Promise<MemberStats | null> {
  const profileId = await getCurrentProfileId();

  const { data, error } = await supabase
    .from('member_stats')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return (data as MemberStats | null) ?? null;
}
