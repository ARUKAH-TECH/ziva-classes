-- ============================================================
-- FIX: infinite recursion in student_profiles RLS policies
-- ============================================================
--
-- students_teacher_view (on student_profiles) subqueries student_enrollments.
-- enrollments_student_view (on student_enrollments) subqueries student_profiles.
-- Postgres expands both policies' USING clauses together for any SELECT
-- (including the implicit SELECT after an INSERT ... .select()), so
-- evaluating one requires evaluating the other, which requires evaluating
-- the first again -> "infinite recursion detected in policy for relation
-- student_profiles". This broke every admin "create student" attempt.
--
-- The same "subquery into student_profiles by optional_user_id" pattern is
-- repeated on student_subjects, attendance, scores, terminal_reports, and
-- terminal_report_subjects. None of those currently have a policy on the
-- other side that reads back into them, so they don't recurse today — but
-- they carry the same latent risk. Fix all of them the same way: a
-- SECURITY DEFINER helper (matching the existing is_admin() /
-- current_organization_id() convention) that resolves the caller's student
-- row without going through student_profiles' own RLS.

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT id
    FROM public.student_profiles
    WHERE optional_user_id = auth.uid()
$$;

DROP POLICY IF EXISTS enrollments_student_view ON student_enrollments;
CREATE POLICY enrollments_student_view
ON student_enrollments
FOR SELECT
USING (
    student_id = public.current_student_id()
);

DROP POLICY IF EXISTS student_subjects_student_view ON student_subjects;
CREATE POLICY student_subjects_student_view
ON student_subjects
FOR SELECT
USING (
    student_id = public.current_student_id()
);

DROP POLICY IF EXISTS attendance_student_view ON attendance;
CREATE POLICY attendance_student_view
ON attendance
FOR SELECT
USING (
    student_id = public.current_student_id()
);

DROP POLICY IF EXISTS scores_student_view ON scores;
CREATE POLICY scores_student_view
ON scores
FOR SELECT
USING (
    student_id = public.current_student_id()
);

DROP POLICY IF EXISTS terminal_reports_student_view ON terminal_reports;
CREATE POLICY terminal_reports_student_view
ON terminal_reports
FOR SELECT
USING (
    student_id = public.current_student_id()
);

DROP POLICY IF EXISTS terminal_report_subjects_student_view ON terminal_report_subjects;
CREATE POLICY terminal_report_subjects_student_view
ON terminal_report_subjects
FOR SELECT
USING (
    terminal_report_id IN (
        SELECT id
        FROM terminal_reports
        WHERE status = 'PUBLISHED'
        AND student_id = public.current_student_id()
    )
);
