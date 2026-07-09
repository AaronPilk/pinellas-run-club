import { supabase } from '@/lib/supabase';
import { uploadToBucket } from '@/services/mediaService';
import type {
  AdminCourseTimeEntry,
  AdminDashboardCounts,
  Course,
  Event,
  LapsedMember,
  Partner,
  Profile,
  SponsorLead,
  UserRole,
  UserStatus,
} from '@/types/models';

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function listPendingMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function listAllMembers(params?: {
  search?: string;
  status?: UserStatus;
  limit?: number;
}): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.status) query = query.eq('status', params.status);
  if (params?.search) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},username.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function approveMember(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_member', { p_profile_id: profileId });
  if (error) throw error;
}

export async function rejectMember(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_member', { p_profile_id: profileId });
  if (error) throw error;
}

export async function suspendMember(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('suspend_member', { p_profile_id: profileId });
  if (error) throw error;
}

export async function setMemberRole(profileId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('set_member_role', {
    p_profile_id: profileId,
    p_role: role,
  });
  if (error) throw error;
}

/**
 * Follow-up report: approved members ordered by how long it has been since
 * their last check-in (never-checked-in members first). Admin-gated in the DB.
 */
export async function getLapsedMembers(): Promise<LapsedMember[]> {
  const { data, error } = await supabase.rpc('admin_get_lapsed_members');
  if (error) throw error;
  return (data ?? []) as LapsedMember[];
}

/** Manually check a member in to an event (front-desk flow). */
export async function adminMarkCheckin(eventId: string, profileId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_mark_checkin', {
    p_event_id: eventId,
    p_profile_id: profileId,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type AdminEventInput = Partial<
  Pick<
    Event,
    | 'title'
    | 'description'
    | 'event_type'
    | 'status'
    | 'event_date'
    | 'starts_at'
    | 'ends_at'
    | 'location_name'
    | 'address'
    | 'latitude'
    | 'longitude'
    | 'distance_miles'
    | 'course_id'
    | 'image_url'
    | 'featured'
    | 'checkin_method'
    | 'checkin_radius_meters'
    | 'checkin_opens_at'
    | 'checkin_closes_at'
    | 'capacity'
    | 'external_ticket_url'
  >
>;

export async function createEvent(
  input: AdminEventInput & { title: string; event_date: string; starts_at: string },
  createdByProfileId: string
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, created_by_profile_id: createdByProfileId })
    .select('*')
    .single();

  if (error) throw error;
  return data as Event;
}

export async function updateEvent(eventId: string, input: AdminEventInput): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(input)
    .eq('id', eventId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Event;
}

export async function uploadEventImage(localUri: string, eventId: string): Promise<string> {
  const path = `${eventId}/cover-${Date.now()}.jpg`;
  return uploadToBucket({ bucket: 'event-images', path, uri: localUri });
}

// ---------------------------------------------------------------------------
// Sponsor leads
// ---------------------------------------------------------------------------

export async function listSponsorLeads(status?: string): Promise<SponsorLead[]> {
  let query = supabase
    .from('sponsor_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SponsorLead[];
}

export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  const { error } = await supabase.from('sponsor_leads').update({ status }).eq('id', leadId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Partners CRUD
// ---------------------------------------------------------------------------

export type AdminPartnerInput = Partial<
  Omit<Partner, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by_profile_id'>
>;

export async function listAllPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Partner[];
}

export async function createPartner(
  input: AdminPartnerInput & { name: string; short_offer: string }
): Promise<Partner> {
  const { data, error } = await supabase.from('partners').insert(input).select('*').single();
  if (error) throw error;
  return data as Partner;
}

export async function updatePartner(partnerId: string, input: AdminPartnerInput): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .update(input)
    .eq('id', partnerId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Partner;
}

/** Soft delete. */
export async function deletePartner(partnerId: string): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', partnerId);

  if (error) throw error;
}

export async function uploadPartnerImage(
  localUri: string,
  partnerId: string,
  kind: 'logo' | 'cover'
): Promise<string> {
  const path = `${partnerId}/${kind}-${Date.now()}.jpg`;
  return uploadToBucket({ bucket: 'partner-images', path, uri: localUri });
}

// ---------------------------------------------------------------------------
// Courses CRUD + time keeper
// ---------------------------------------------------------------------------

export type AdminCourseInput = Partial<
  Omit<Course, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by_profile_id'>
>;

export async function listAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function createCourse(
  input: AdminCourseInput & { name: string; distance_miles: number }
): Promise<Course> {
  const { data, error } = await supabase.from('courses').insert(input).select('*').single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(courseId: string, input: AdminCourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update(input)
    .eq('id', courseId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Course;
}

/** Soft delete. */
export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq('id', courseId);

  if (error) throw error;
}

export async function listCourseTimes(params?: {
  courseId?: string;
  verified?: boolean;
  limit?: number;
}): Promise<AdminCourseTimeEntry[]> {
  let query = supabase
    .from('course_time_entries')
    .select('*, course:courses(id, name, distance_miles), profile:profiles(id, full_name, username, avatar_url)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(params?.limit ?? 100);

  if (params?.courseId) query = query.eq('course_id', params.courseId);
  if (params?.verified !== undefined) query = query.eq('verified', params.verified);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AdminCourseTimeEntry[];
}

export async function verifyCourseTime(entryId: string): Promise<void> {
  const { error } = await supabase.rpc('verify_course_time', { p_entry_id: entryId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Announcements (push via Edge Function) + dashboard
// ---------------------------------------------------------------------------

/**
 * Send a push announcement to all members via the send-push Edge Function.
 * The function is admin-gated server-side; do not expose to regular members.
 */
export async function sendAnnouncement(input: {
  title: string;
  body: string;
  deepLink?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-push', {
    body: {
      title: input.title,
      body: input.body,
      data: input.deepLink ? { deep_link: input.deepLink } : {},
      all: true,
    },
  });

  if (error) throw error;
}

export async function getDashboardCounts(): Promise<AdminDashboardCounts> {
  const nowIso = new Date().toISOString();

  const [pending, total, upcoming, leads, times] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('deleted_at', null),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .is('deleted_at', null),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .is('deleted_at', null)
      .gte('starts_at', nowIso),
    supabase
      .from('sponsor_leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('course_time_entries')
      .select('id', { count: 'exact', head: true })
      .eq('verified', false)
      .is('deleted_at', null),
  ]);

  for (const result of [pending, total, upcoming, leads, times]) {
    if (result.error) throw result.error;
  }

  return {
    pending_members: pending.count ?? 0,
    total_members: total.count ?? 0,
    upcoming_events: upcoming.count ?? 0,
    new_sponsor_leads: leads.count ?? 0,
    unverified_times: times.count ?? 0,
  };
}
