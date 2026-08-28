-- ============================================================
-- FIX: parents can't see their own children's teachers' names
-- ============================================================
--
-- teacher_profiles only had teachers_admin_manage (admin) and
-- teachers_self_select (the teacher's own row) — no policy let a parent
-- read the teacher_profiles row for a teacher who actually teaches their
-- child. Every nested `teacher_profiles(users(...))` select from a
-- parent-scoped query (e.g. the parent's timetable, built this session)
-- silently comes back null for the teacher's name, not an error, so this
-- was easy to miss without actually looking at the rendered page.
--
-- Same SECURITY DEFINER-helper pattern as current_teacher_student_ids() /
-- current_teacher_parent_ids() (006-008) to avoid reintroducing an RLS
-- recursion cycle between teacher_profiles and the tables this has to walk
-- through (student_enrollments, class_subjects, teacher_assignments).

CREATE OR REPLACE FUNCTION public.current_parent_teacher_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT DISTINCT ta.teacher_id
    FROM teacher_assignments ta
    JOIN class_subjects cs ON cs.id = ta.class_subject_id
    JOIN student_enrollments se ON se.class_id = cs.class_id AND se.status = 'ACTIVE'
    JOIN parent_students ps ON ps.student_id = se.student_id
    JOIN parent_profiles pp ON pp.id = ps.parent_id
    WHERE pp.user_id = auth.uid()
$$;

CREATE POLICY teachers_parent_view
ON teacher_profiles
FOR SELECT
USING (
    id IN (SELECT public.current_parent_teacher_ids())
);
