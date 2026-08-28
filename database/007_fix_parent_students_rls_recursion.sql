-- ============================================================
-- FIX: infinite recursion in student_enrollments / parent_students RLS
-- ============================================================
--
-- Second recursion pair, independent of 006's fix, surfaced by the same
-- "create student + enroll" flow:
--
--   enrollments_parent_view (on student_enrollments) subqueries
--   parent_students; parent_students_teacher_view (on parent_students,
--   added by 005_messages_rls_fix.sql for teacher messaging visibility)
--   subqueries student_enrollments. Evaluating either requires evaluating
--   the other -> "infinite recursion detected in policy for relation
--   student_enrollments".
--
-- students_teacher_view (on student_profiles) has the exact same
-- "student_enrollments -> teacher_assignments -> class_subjects ->
-- teacher_profiles" subquery inlined. It isn't part of a live cycle today
-- (006 already cut the student_profiles <-> student_enrollments cycle),
-- but it's the same fragile pattern — any future policy that reads back
-- from student_profiles into one of those tables reintroduces this bug
-- class. Fix both call sites with one SECURITY DEFINER helper, same
-- convention as current_student_id().

CREATE OR REPLACE FUNCTION public.current_teacher_student_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT se.student_id
    FROM student_enrollments se
    JOIN teacher_assignments ta
        ON ta.class_subject_id IN (
            SELECT cs.id FROM class_subjects cs WHERE cs.class_id = se.class_id
        )
    WHERE ta.teacher_id IN (
        SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
    )
$$;

DROP POLICY IF EXISTS parent_students_teacher_view ON parent_students;
CREATE POLICY parent_students_teacher_view
ON parent_students
FOR SELECT
USING (
    student_id IN (SELECT public.current_teacher_student_ids())
);

DROP POLICY IF EXISTS students_teacher_view ON student_profiles;
CREATE POLICY students_teacher_view
ON student_profiles
FOR SELECT
USING (
    id IN (SELECT public.current_teacher_student_ids())
);
