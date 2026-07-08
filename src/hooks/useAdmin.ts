import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import * as adminService from '@/services/adminService';
import type { UserRole, UserStatus } from '@/types/models';

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function usePendingMembers() {
  return useQuery({
    queryKey: queryKeys.admin.pendingMembers(),
    queryFn: adminService.listPendingMembers,
  });
}

export function useAllMembers(params?: { search?: string; status?: UserStatus }) {
  return useQuery({
    queryKey: queryKeys.admin.members(params?.search, params?.status),
    queryFn: () => adminService.listAllMembers(params),
  });
}

function useMemberMutation(fn: (profileId: string) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      qc.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}

export function useApproveMember() {
  return useMemberMutation(adminService.approveMember);
}

export function useRejectMember() {
  return useMemberMutation(adminService.rejectMember);
}

export function useSuspendMember() {
  return useMemberMutation(adminService.suspendMember);
}

export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, role }: { profileId: string; role: UserRole }) =>
      adminService.setMemberRole(profileId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

export function useAdminMarkCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, profileId }: { eventId: string; profileId: string }) =>
      adminService.adminMarkCheckin(eventId, profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all });
      qc.invalidateQueries({ queryKey: queryKeys.checkins.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function useAdminCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      createdByProfileId,
    }: {
      input: adminService.AdminEventInput & { title: string; event_date: string; starts_at: string };
      createdByProfileId: string;
    }) => adminService.createEvent(input, createdByProfileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

export function useAdminUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: adminService.AdminEventInput }) =>
      adminService.updateEvent(eventId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Sponsor leads
// ---------------------------------------------------------------------------

export function useSponsorLeads(status?: string) {
  return useQuery({
    queryKey: queryKeys.admin.sponsorLeads(status),
    queryFn: () => adminService.listSponsorLeads(status),
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      adminService.updateLeadStatus(leadId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Partners CRUD
// ---------------------------------------------------------------------------

export function useAdminPartners() {
  return useQuery({
    queryKey: queryKeys.admin.partners(),
    queryFn: adminService.listAllPartners,
  });
}

export function useAdminCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.createPartner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.partners() });
      qc.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

export function useAdminUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerId, input }: { partnerId: string; input: adminService.AdminPartnerInput }) =>
      adminService.updatePartner(partnerId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.partners() });
      qc.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

export function useAdminDeletePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: string) => adminService.deletePartner(partnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.partners() });
      qc.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Courses CRUD + time verification
// ---------------------------------------------------------------------------

export function useAdminCourses() {
  return useQuery({
    queryKey: queryKeys.admin.courses(),
    queryFn: adminService.listAllCourses,
  });
}

export function useAdminCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminService.createCourse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.courses() });
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

export function useAdminUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, input }: { courseId: string; input: adminService.AdminCourseInput }) =>
      adminService.updateCourse(courseId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.courses() });
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

export function useAdminDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => adminService.deleteCourse(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.courses() });
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

export function useCourseTimes(params?: { courseId?: string; verified?: boolean }) {
  return useQuery({
    queryKey: queryKeys.admin.courseTimes(params?.courseId, params?.verified),
    queryFn: () => adminService.listCourseTimes(params),
  });
}

export function useVerifyTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => adminService.verifyCourseTime(entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Announcements + dashboard
// ---------------------------------------------------------------------------

export function useSendAnnouncement() {
  return useMutation({
    mutationFn: adminService.sendAnnouncement,
  });
}

export function useDashboardCounts() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: adminService.getDashboardCounts,
  });
}
