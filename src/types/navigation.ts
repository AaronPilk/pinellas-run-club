import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  PendingApproval: undefined;
  Suspended: undefined;
  CompleteProfile: undefined;
  App: NavigatorScreenParams<AppTabsParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// ---------------------------------------------------------------------------
// Auth stack
// ---------------------------------------------------------------------------

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: { inviteCode?: string } | undefined;
  ForgotPassword: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

// ---------------------------------------------------------------------------
// Bottom tabs
// ---------------------------------------------------------------------------

export type AppTabsParamList = {
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  EventsTab: NavigatorScreenParams<EventsStackParamList>;
  CheckInTab: NavigatorScreenParams<CheckInStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

export type AppTabScreenProps<T extends keyof AppTabsParamList> =
  BottomTabScreenProps<AppTabsParamList, T>;

// ---------------------------------------------------------------------------
// Feed stack
// ---------------------------------------------------------------------------

export type FeedStackParamList = {
  FeedHome: undefined;
  CreatePost: { eventId?: string } | undefined;
  PostDetail: { postId: string };
  MemberProfile: { profileId: string };
};

export type FeedStackScreenProps<T extends keyof FeedStackParamList> =
  NativeStackScreenProps<FeedStackParamList, T>;

// ---------------------------------------------------------------------------
// Events stack
// ---------------------------------------------------------------------------

export type EventsStackParamList = {
  EventsHome: undefined;
  EventDetail: { eventId: string };
  EventAttendees: { eventId: string };
  CreateEditEvent: { eventId?: string } | undefined;
};

export type EventsStackScreenProps<T extends keyof EventsStackParamList> =
  NativeStackScreenProps<EventsStackParamList, T>;

// ---------------------------------------------------------------------------
// Check-in stack
// ---------------------------------------------------------------------------

export type CheckInStackParamList = {
  CheckInHome: undefined;
  CheckInHistory: undefined;
};

export type CheckInStackScreenProps<T extends keyof CheckInStackParamList> =
  NativeStackScreenProps<CheckInStackParamList, T>;

// ---------------------------------------------------------------------------
// Profile stack
// ---------------------------------------------------------------------------

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  MyBadges: undefined;
  MemberPass: undefined;
  Settings: undefined;
};

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

// ---------------------------------------------------------------------------
// More stack (partners, courses, admin live here)
// ---------------------------------------------------------------------------

export type MoreStackParamList = {
  MoreHome: undefined;
  Notifications: undefined;
  MyQRCode: undefined;
  Sponsorship: undefined;
  InviteFriend: undefined;
  HelpSupport: undefined;
  PartnerPerks: undefined;
  PartnerDetail: { partnerId: string };
  Courses: undefined;
  CourseDetail: { courseId: string };
  TimeEntry: { courseId: string; eventId?: string };
  CourseHistory: { courseId?: string } | undefined;
  AdminDashboard: undefined;
  AdminMembers: undefined;
  AdminLapsedMembers: undefined;
  AdminEvents: undefined;
  AdminPartners: undefined;
  AdminCourses: undefined;
  AdminSponsorLeads: undefined;
  AdminNotifications: undefined;
};

export type MoreStackScreenProps<T extends keyof MoreStackParamList> =
  NativeStackScreenProps<MoreStackParamList, T>;

// ---------------------------------------------------------------------------
// Global type augmentation so useNavigation() is typed by default
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
