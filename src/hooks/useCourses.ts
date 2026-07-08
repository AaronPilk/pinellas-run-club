import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';
import { getCourse, listCourses, listMyEntries, submitTime } from '@/services/coursesService';

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: listCourses,
  });
}

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: () => getCourse(courseId),
    enabled: Boolean(courseId),
  });
}

export function useMyCourseEntries(courseId?: string) {
  return useQuery({
    queryKey: queryKeys.courses.myEntries(courseId),
    queryFn: () => listMyEntries(courseId),
  });
}

export function useSubmitTime() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: submitTime,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
      qc.invalidateQueries({ queryKey: queryKeys.badges.all });
      qc.invalidateQueries({ queryKey: queryKeys.checkins.stats() });
    },
  });
}
