-- ============================================================
-- FIX: no student-facing SELECT policy on assessments, class_schedules,
-- or class_sessions
-- ============================================================
--
-- Every other role that legitimately needs to see these tables has a
-- *_parent_view / *_teacher_view policy already (rls_policies.sql) — a
-- STUDENT never got the equivalent, so a signed-in student querying any of
-- the three got zero rows back, silently, from RLS (not an error) rather
-- than their own assignments/timetable/session history. Found while
-- building the Student portal's Assignments/Timetable/Attendance pages.
--
-- Scoped directly off student_subjects for this student (no cross-table
-- lookup that could recreate the 006-008 recursion class — student_subjects
-- has no policy that reads back into any of these three tables).

CREATE POLICY assessments_student_view
ON assessments
FOR SELECT
USING (
    class_subject_id IN (
        SELECT class_subject_id FROM student_subjects WHERE student_id = public.current_student_id()
    )
);

CREATE POLICY schedules_student_view
ON class_schedules
FOR SELECT
USING (
    class_subject_id IN (
        SELECT class_subject_id FROM student_subjects WHERE student_id = public.current_student_id()
    )
);

CREATE POLICY sessions_student_view
ON class_sessions
FOR SELECT
USING (
    class_subject_id IN (
        SELECT class_subject_id FROM student_subjects WHERE student_id = public.current_student_id()
    )
);
