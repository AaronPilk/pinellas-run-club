import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type {
  Event,
  EventAttendee,
  EventDetail,
  EventWithRsvp,
  ProfileSummary,
  RsvpStatus,
} from '@/types/models';

const EVENT_LIST_SELECT = `
  *,
  course:courses(*),
  rsvps:event_rsvps(status, profile_id),
  checkins:event_checkins(profile_id)
`;

type RawRsvp = { status: RsvpStatus; profile_id: string };
type RawCheckin = { profile_id: string };
type RawEventRow = Event & {
  course: EventWithRsvp['course'];
  rsvps: RawRsvp[];
  checkins: RawCheckin[];
};

function toEventWithRsvp(row: RawEventRow, myProfileId: string | null): EventWithRsvp {
  const rsvps = row.rsvps ?? [];
  const checkins = row.checkins ?? [];
  const mine = myProfileId ? rsvps.find((r) => r.profile_id === myProfileId) : undefined;

  const { rsvps: _r, checkins: _c, ...event } = row;

  return {
    ...event,
    course: row.course ?? null,
    going_count: rsvps.filter((r) => r.status === 'going').length,
    maybe_count: rsvps.filter((r) => r.status === 'maybe').length,
    checkin_count: checkins.length,
    my_rsvp: mine?.status ?? null,
    checked_in: myProfileId ? checkins.some((c) => c.profile_id === myProfileId) : false,
  };
}

async function safeProfileId(): Promise<string | null> {
  try {
    return await getCurrentProfileId();
  } catch {
    return null;
  }
}

/** Published upcoming events, soonest first, with counts and my RSVP state. */
export async function listUpcomingEvents(): Promise<EventWithRsvp[]> {
  const myProfileId = await safeProfileId();

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_LIST_SELECT)
    .eq('status', 'published')
    .is('deleted_at', null)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  return ((data ?? []) as unknown as RawEventRow[]).map((row) => toEventWithRsvp(row, myProfileId));
}

/** Past events (published/completed), most recent first. */
export async function listPastEvents(limit = 20): Promise<EventWithRsvp[]> {
  const myProfileId = await safeProfileId();

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_LIST_SELECT)
    .in('status', ['published', 'completed'])
    .is('deleted_at', null)
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as unknown as RawEventRow[]).map((row) => toEventWithRsvp(row, myProfileId));
}

/** Upcoming events the current member RSVP'd "going" or "maybe" to. */
export async function listMyEvents(): Promise<EventWithRsvp[]> {
  const events = await listUpcomingEvents();
  return events.filter((e) => e.my_rsvp === 'going' || e.my_rsvp === 'maybe');
}

/** Full event detail with attendee list. */
export async function getEvent(eventId: string): Promise<EventDetail> {
  const myProfileId = await safeProfileId();

  const { data, error } = await supabase
    .from('events')
    .select(
      `
      *,
      course:courses(*),
      rsvps:event_rsvps(*, profile:profiles(id, full_name, username, avatar_url)),
      checkins:event_checkins(profile_id)
    `
    )
    .eq('id', eventId)
    .single();

  if (error) throw error;

  type RawDetailRsvp = EventAttendee['rsvp'] & { profile: ProfileSummary };
  const row = data as unknown as Event & {
    course: EventDetail['course'];
    rsvps: RawDetailRsvp[];
    checkins: RawCheckin[];
  };

  const rsvps = row.rsvps ?? [];
  const checkins = row.checkins ?? [];
  const checkedInIds = new Set(checkins.map((c) => c.profile_id));

  const attendees: EventAttendee[] = rsvps
    .filter((r) => r.status !== 'not_going')
    .map(({ profile, ...rsvp }) => ({
      rsvp,
      profile,
      checked_in: checkedInIds.has(rsvp.profile_id),
    }));

  const mine = myProfileId ? rsvps.find((r) => r.profile_id === myProfileId) : undefined;
  const { rsvps: _r, checkins: _c, ...event } = row;

  return {
    ...event,
    course: row.course ?? null,
    going_count: rsvps.filter((r) => r.status === 'going').length,
    maybe_count: rsvps.filter((r) => r.status === 'maybe').length,
    checkin_count: checkins.length,
    my_rsvp: mine?.status ?? null,
    checked_in: myProfileId ? checkedInIds.has(myProfileId) : false,
    attendees,
  };
}

/** RSVP via secure RPC (server enforces membership + status). */
export async function rsvpEvent(eventId: string, status: RsvpStatus): Promise<void> {
  const { error } = await supabase.rpc('rsvp_event', {
    p_event_id: eventId,
    p_status: status,
  });

  if (error) throw error;
}

/** Attendee list for the dedicated attendees screen. */
export async function listAttendees(eventId: string): Promise<EventAttendee[]> {
  const detail = await getEvent(eventId);
  return detail.attendees;
}
