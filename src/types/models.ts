/**
 * App-level TypeScript models. Column names mirror the Postgres schema exactly
 * (snake_case) so query results can be assigned without mapping layers.
 */

// ---------------------------------------------------------------------------
// Enums (string literal unions matching Postgres enums)
// ---------------------------------------------------------------------------

export type UserRole = 'super_admin' | 'admin' | 'member';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventType =
  | 'weekly_run'
  | 'social_run'
  | 'race'
  | 'challenge'
  | 'after_party'
  | 'sponsor_event'
  | 'volunteer'
  | 'other';
export type RsvpStatus = 'going' | 'maybe' | 'not_going';
export type CheckinMethod = 'gps' | 'qr' | 'gps_or_qr' | 'admin_manual';
export type PostVisibility = 'members' | 'public' | 'hidden';
export type MediaType = 'image' | 'video';
export type PartnerCategory =
  | 'food_drink'
  | 'fitness'
  | 'retail'
  | 'recovery'
  | 'wellness'
  | 'events'
  | 'other';
export type SponsorLevel = 'community' | 'bronze' | 'silver' | 'gold' | 'title';
export type NotificationType =
  | 'event'
  | 'rsvp'
  | 'checkin'
  | 'badge'
  | 'perk'
  | 'announcement'
  | 'system';
export type SponsorLeadStatus = 'new' | 'contacted' | 'won' | 'lost';
export type MemberPassStatus = 'active' | 'revoked' | 'expired';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  favorite_run_spot: string | null;
  running_level: string | null;
  typical_pace: string | null;
  favorite_distance: string | null;
  interests: string[];
  role: UserRole;
  status: UserStatus;
  invited_by_profile_id: string | null;
  invite_code: string;
  member_number: number;
  allow_public_stats: boolean;
  notification_events: boolean;
  notification_perks: boolean;
  notification_social: boolean;
  notification_badges: boolean;
  last_active_at: string | null;
  approved_at: string | null;
  approved_by_profile_id: string | null;
  profile_completed_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_updated_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Lightweight profile shape used in joins (author rows, attendee lists). */
export interface ProfileSummary {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface AppSettings {
  id: number;
  require_member_approval: boolean;
  default_checkin_radius_meters: number;
  allow_late_checkin_minutes: number;
  club_name: string;
  club_tagline: string;
  support_email: string | null;
  instagram_url: string | null;
  website_url: string | null;
  stripe_checkout_url: string | null;
  subscription_price_label: string | null;
  paywall_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  event_date: string;
  starts_at: string;
  ends_at: string | null;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number | null;
  course_id: string | null;
  image_url: string | null;
  featured: boolean;
  checkin_method: CheckinMethod;
  checkin_radius_meters: number | null;
  checkin_opens_at: string | null;
  checkin_closes_at: string | null;
  qr_checkin_nonce: string | null;
  capacity: number | null;
  external_ticket_url: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  profile_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export interface EventCheckin {
  id: string;
  event_id: string;
  profile_id: string;
  checked_in_at: string;
  method: CheckinMethod;
  latitude: number | null;
  longitude: number | null;
  distance_from_event_meters: number | null;
  verified: boolean;
  verified_by_profile_id: string | null;
  admin_note: string | null;
  created_at: string;
}

export interface FeedPost {
  id: string;
  profile_id: string;
  caption: string | null;
  location_name: string | null;
  event_id: string | null;
  visibility: PostVisibility;
  like_count: number;
  comment_count: number;
  hidden_at: string | null;
  hidden_by_profile_id: string | null;
  pinned_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedPostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: MediaType;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
}

export interface FeedComment {
  id: string;
  post_id: string;
  profile_id: string;
  content: string;
  hidden_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  name: string;
  category: PartnerCategory;
  sponsor_level: SponsorLevel;
  logo_url: string | null;
  cover_image_url: string | null;
  short_offer: string;
  offer_details: string | null;
  redeem_instructions: string | null;
  terms: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  instagram_url: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  featured: boolean;
  sort_order: number;
  offer_expires_at: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemberPass {
  id: string;
  profile_id: string;
  public_pass_id: string;
  status: MemberPassStatus | string;
  issued_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface SponsorLead {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  category: string | null;
  proposed_offer: string | null;
  message: string | null;
  status: SponsorLeadStatus | string;
  assigned_to_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  distance_miles: number;
  latitude: number | null;
  longitude: number | null;
  route_image_url: string | null;
  map_polyline: string | null;
  active: boolean;
  featured: boolean;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CourseTimeEntry {
  id: string;
  course_id: string;
  profile_id: string;
  event_id: string | null;
  run_date: string;
  time_seconds: number;
  pace_seconds_per_mile: number | null;
  notes: string | null;
  verified: boolean;
  verified_by_profile_id: string | null;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PointsLedgerEntry {
  id: string;
  profile_id: string;
  action_type: string;
  points: number;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export interface MemberStats {
  profile_id: string;
  points_total: number;
  checkins_total: number;
  checkins_this_week: number;
  checkins_this_month: number;
  events_rsvped_total: number;
  badges_total: number;
  current_week_streak: number;
  longest_week_streak: number;
  course_prs_total: number;
  invite_approvals_total: number;
  last_checkin_at: string | null;
  updated_at: string;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface MemberBadge {
  id: string;
  profile_id: string;
  badge_id: string;
  awarded_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  deep_link: string | null;
  created_at: string;
}

export interface PushToken {
  id: string;
  profile_id: string;
  expo_push_token: string;
  platform: string | null;
  device_id: string | null;
  active: boolean;
  last_seen_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Composite / view types (shapes returned by the service layer)
// ---------------------------------------------------------------------------

/** Event list item enriched with RSVP counts + the current member's state. */
export interface EventWithRsvp extends Event {
  course: Course | null;
  going_count: number;
  maybe_count: number;
  checkin_count: number;
  my_rsvp: RsvpStatus | null;
  checked_in: boolean;
}

export interface EventAttendee {
  rsvp: EventRsvp;
  profile: ProfileSummary;
  checked_in: boolean;
}

/** Full event detail incl. attendees; used on EventDetailScreen. */
export interface EventDetail extends EventWithRsvp {
  attendees: EventAttendee[];
}

export interface FeedPostWithAuthor extends FeedPost {
  author: ProfileSummary;
  media: FeedPostMedia[];
  liked_by_me: boolean;
}

export interface FeedCommentWithAuthor extends FeedComment {
  author: ProfileSummary;
}

export interface CourseWithBestTime extends Course {
  my_best_seconds: number | null;
  my_last_seconds: number | null;
  my_last_run_date: string | null;
  my_entry_count: number;
}

export interface CourseTimeEntryWithCourse extends CourseTimeEntry {
  course: Course;
  event: Pick<Event, 'id' | 'title' | 'starts_at'> | null;
}

export interface MemberBadgeWithBadge extends MemberBadge {
  badge: Badge;
}

export interface CheckinWithEvent extends EventCheckin {
  event: Pick<Event, 'id' | 'title' | 'starts_at' | 'location_name' | 'event_type'> | null;
}

/** Public member profile page (other members). */
export interface MemberProfile {
  profile: Profile;
  stats: MemberStats | null;
  badges: MemberBadgeWithBadge[];
}

export interface AdminCourseTimeEntry extends CourseTimeEntry {
  course: Pick<Course, 'id' | 'name' | 'distance_miles'>;
  profile: ProfileSummary;
}

/** Row returned by the admin_get_lapsed_members RPC. */
export interface LapsedMember {
  profile_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  last_checkin_at: string | null;
  checkins_total: number;
  member_since: string;
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

export interface DmConversation {
  id: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_profile_id: string | null;
}

export interface DmParticipant {
  id: string;
  conversation_id: string;
  profile_id: string;
  last_read_at: string | null;
  created_at: string;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

/** Inbox row: a conversation + the other member + whether it has unread. */
export interface DmConversationListItem {
  conversation: DmConversation;
  other: ProfileSummary;
  unread: boolean;
}

export interface AdminDashboardCounts {
  pending_members: number;
  total_members: number;
  upcoming_events: number;
  new_sponsor_leads: number;
  unverified_times: number;
}
