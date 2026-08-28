-- ============================================================
-- FIX: infinite recursion in parent_profiles / parent_students RLS
-- ============================================================
--
-- Third recursion pair from the same "create student + enroll" flow, after
-- 006 and 007:
--
--   parent_profiles_teacher_view (on parent_profiles, added by
--   005_messages_rls_fix.sql) subqueries parent_students; parent_students'
--   own policies (parent_students_parent_view, and 007's rewritten
--   parent_students_teacher_view) subquery parent_profiles. Evaluating
--   either requires the other -> "infinite recursion detected in policy
--   for relation parent_profiles".
--
-- Same fix shape as 006/007: resolve the teacher's reachable parent ids
-- with a SECURITY DEFINER helper that reads parent_students directly,
-- bypassing its RLS, instead of going through a policy-protected subquery.

CREATE OR REPLACE FUNCTION public.current_teacher_parent_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT DISTINCT ps.parent_id
    FROM parent_students ps
    WHERE ps.student_id IN (SELECT public.current_teacher_student_ids())
$$;

DROP POLICY IF EXISTS parent_profiles_teacher_view ON parent_profiles;
CREATE POLICY parent_profiles_teacher_view
ON parent_profiles
FOR SELECT
USING (
    id IN (SELECT public.current_teacher_parent_ids())
);
