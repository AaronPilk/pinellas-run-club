/**
 * Central query key factory. Every hook uses these — never inline string keys.
 */
export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    member: (profileId: string) => [...queryKeys.profile.all, 'member', profileId] as const,
  },
  events: {
    all: ['events'] as const,
    upcoming: () => [...queryKeys.events.all, 'upcoming'] as const,
    past: () => [...queryKeys.events.all, 'past'] as const,
    mine: () => [...queryKeys.events.all, 'mine'] as const,
    detail: (eventId: string) => [...queryKeys.events.all, 'detail', eventId] as const,
    attendees: (eventId: string) => [...queryKeys.events.all, 'attendees', eventId] as const,
  },
  checkins: {
    all: ['checkins'] as const,
    current: () => [...queryKeys.checkins.all, 'current'] as const,
    history: () => [...queryKeys.checkins.all, 'history'] as const,
    stats: () => [...queryKeys.checkins.all, 'stats'] as const,
  },
  feed: {
    all: ['feed'] as const,
    list: () => [...queryKeys.feed.all, 'list'] as const,
    post: (postId: string) => [...queryKeys.feed.all, 'post', postId] as const,
    comments: (postId: string) => [...queryKeys.feed.all, 'comments', postId] as const,
  },
  partners: {
    all: ['partners'] as const,
    list: () => [...queryKeys.partners.all, 'list'] as const,
    detail: (partnerId: string) => [...queryKeys.partners.all, 'detail', partnerId] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: () => [...queryKeys.courses.all, 'list'] as const,
    detail: (courseId: string) => [...queryKeys.courses.all, 'detail', courseId] as const,
    myEntries: (courseId?: string) =>
      [...queryKeys.courses.all, 'myEntries', courseId ?? 'all'] as const,
  },
  badges: {
    all: ['badges'] as const,
    mine: () => [...queryKeys.badges.all, 'mine'] as const,
    catalog: () => [...queryKeys.badges.all, 'catalog'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
  memberPass: {
    all: ['memberPass'] as const,
    mine: () => [...queryKeys.memberPass.all, 'mine'] as const,
  },
  admin: {
    all: ['admin'] as const,
    pendingMembers: () => [...queryKeys.admin.all, 'pendingMembers'] as const,
    members: (search?: string, status?: string) =>
      [...queryKeys.admin.all, 'members', search ?? '', status ?? ''] as const,
    sponsorLeads: (status?: string) =>
      [...queryKeys.admin.all, 'sponsorLeads', status ?? 'all'] as const,
    partners: () => [...queryKeys.admin.all, 'partners'] as const,
    courses: () => [...queryKeys.admin.all, 'courses'] as const,
    courseTimes: (courseId?: string, verified?: boolean) =>
      [...queryKeys.admin.all, 'courseTimes', courseId ?? 'all', String(verified ?? 'all')] as const,
    dashboard: () => [...queryKeys.admin.all, 'dashboard'] as const,
  },
} as const;
