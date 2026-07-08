import { supabase } from '@/lib/supabase';
import { getCurrentProfileId } from '@/services/profileService';
import type { Course, CourseTimeEntry, CourseTimeEntryWithCourse, CourseWithBestTime } from '@/types/models';

/** Active courses with my best/last time merged in. */
export async function listCourses(): Promise<CourseWithBestTime[]> {
  const profileId = await getCurrentProfileId();

  const [{ data: courses, error: coursesError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('*')
        .eq('active', true)
        .is('deleted_at', null)
        .order('featured', { ascending: false })
        .order('name', { ascending: true }),
      supabase
        .from('course_time_entries')
        .select('course_id, time_seconds, run_date')
        .eq('profile_id', profileId)
        .is('deleted_at', null)
        .order('run_date', { ascending: false }),
    ]);

  if (coursesError) throw coursesError;
  if (entriesError) throw entriesError;

  const byCourse = new Map<string, { best: number; last: number; lastDate: string; count: number }>();
  for (const entry of (entries ?? []) as Pick<CourseTimeEntry, 'course_id' | 'time_seconds' | 'run_date'>[]) {
    const existing = byCourse.get(entry.course_id);
    if (!existing) {
      byCourse.set(entry.course_id, {
        best: entry.time_seconds,
        last: entry.time_seconds,
        lastDate: entry.run_date,
        count: 1,
      });
    } else {
      existing.best = Math.min(existing.best, entry.time_seconds);
      existing.count += 1;
    }
  }

  return ((courses ?? []) as Course[]).map((course) => {
    const mine = byCourse.get(course.id);
    return {
      ...course,
      my_best_seconds: mine?.best ?? null,
      my_last_seconds: mine?.last ?? null,
      my_last_run_date: mine?.lastDate ?? null,
      my_entry_count: mine?.count ?? 0,
    };
  });
}

export async function getCourse(courseId: string): Promise<Course> {
  const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();

  if (error) throw error;
  return data as Course;
}

/** My time entries, newest first. Optionally scoped to one course. */
export async function listMyEntries(courseId?: string): Promise<CourseTimeEntryWithCourse[]> {
  const profileId = await getCurrentProfileId();

  let query = supabase
    .from('course_time_entries')
    .select('*, course:courses(*), event:events(id, title, starts_at)')
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('run_date', { ascending: false })
    .limit(100);

  if (courseId) query = query.eq('course_id', courseId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CourseTimeEntryWithCourse[];
}

/** Manual time entry via secure RPC (server computes pace, PRs, points). */
export async function submitTime(input: {
  courseId: string;
  runDate: string; // yyyy-MM-dd
  timeSeconds: number;
  notes?: string;
  eventId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('submit_course_time', {
    p_course_id: input.courseId,
    p_run_date: input.runDate,
    p_time_seconds: input.timeSeconds,
    p_notes: input.notes?.trim() || null,
    p_event_id: input.eventId ?? null,
  });

  if (error) throw error;
}
