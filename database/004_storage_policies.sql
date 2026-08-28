-- ============================================================
-- ZIVA ONLINE & SPECIAL CLASSES
-- 004 — STORAGE BUCKET + PHOTO ACCESS POLICIES
-- ============================================================
-- database/rls_policies.sql §34 only described the intended photo access
-- rules in comments — no bucket or storage.objects policies actually
-- existed. This file creates both.
--
-- Path convention: objects are stored as "{student_id}/{filename}",
-- e.g. "3fa85f64-5717-4562-b3fc-2c963f66afa6/passport.jpg". Every policy
-- below extracts the student_id from the first path segment via
-- storage.foldername(name) and joins back to student_profiles /
-- teacher_assignments / parent_students the same way the table RLS does.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', false)
ON CONFLICT (id) DO NOTHING;

-- ---- Admin: full management, scoped to their own organization ----
CREATE POLICY student_photos_admin_manage
ON storage.objects
FOR ALL
USING (
    bucket_id = 'student-photos'
    AND public.is_admin()
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
)
WITH CHECK (
    bucket_id = 'student-photos'
    AND public.is_admin()
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM student_profiles WHERE organization_id = public.current_organization_id()
    )
);

-- ---- Teacher: view only, students they are actually assigned to ----
CREATE POLICY student_photos_teacher_view
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT se.student_id
        FROM student_enrollments se
        JOIN teacher_assignments ta
            ON ta.class_subject_id IN (
                SELECT cs.id FROM class_subjects cs WHERE cs.class_id = se.class_id
            )
        WHERE ta.teacher_id IN (SELECT id FROM teacher_profiles WHERE user_id = auth.uid())
    )
);

-- ---- Parent: view only, their own children ----
CREATE POLICY student_photos_parent_view
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT student_id FROM parent_students
        WHERE parent_id IN (SELECT id FROM parent_profiles WHERE user_id = auth.uid())
    )
);

-- ---- Optional student account: view only, their own photo ----
CREATE POLICY student_photos_student_view
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'student-photos'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM student_profiles WHERE optional_user_id = auth.uid()
    )
);

-- ============================================================
-- Note: the bucket is private (public = false). The app never links
-- directly to a storage URL — it always resolves a short-lived signed
-- URL server-side (see src/lib/actions/student-photo.ts), so even a
-- leaked/cached URL expires quickly.
-- ============================================================

-- ============================================================
-- END 004
-- ============================================================
