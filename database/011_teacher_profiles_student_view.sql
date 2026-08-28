-- ============================================================
-- FIX: students can't see their own teachers' names either
-- ============================================================
--
-- Same gap as 009 (parent version) — teacher_profiles had no SELECT policy
-- for a student, so the nested teacher_profiles(users(...)) join on the
-- student's own Timetable/Assignments pages silently came back null.
--
-- A direct inline subquery into teacher_assignments here would recreate the
-- 006-008 recursion class: teacher_assignments' own policies
-- (teacher_assignments_admin_manage, teacher_assignments_teacher_view) both
-- read back into teacher_profiles. SECURITY DEFINER helper, same pattern as
-- current_teacher_student_ids() (007), sidesteps that.

CREATE OR REPLACE FUNCTION public.current_student_teacher_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT DISTINCT ta.teacher_id
    FROM teacher_assignments ta
    WHERE ta.class_subject_id IN (
        SELECT class_subject_id FROM student_subjects WHERE student_id = public.current_student_id()
    )
$$;

CREATE POLICY teachers_student_view
ON teacher_profiles
FOR SELECT
USING (
    id IN (SELECT public.current_student_teacher_ids())
);
