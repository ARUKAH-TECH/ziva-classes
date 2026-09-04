-- ============================================================
-- 024 — LESSON PLAN LIBRARY STORAGE
-- ============================================================
-- Original source documents (docx/pdf) behind each lesson_plan_library
-- row, so an admin (or a teacher viewing an approved entry) can open the
-- real source document, not just the extracted fields. Private bucket,
-- same convention as database/004_storage_policies.sql.
--
-- Path convention: "{organization_id}/{random_id}/{filename}" — a random
-- id, not a lesson_plan_library row id, because one source document can
-- produce several library rows (one per subject/week found inside it)
-- that all share the same uploaded file. Every policy below extracts the
-- organization_id from the first path segment via storage.foldername(name);
-- the teacher policy additionally checks the full object name against the
-- storage_path recorded on an approved row, since there is no single row
-- id to key off of.

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-plan-library', 'lesson-plan-library', false)
ON CONFLICT (id) DO NOTHING;

-- ---- Admin: full management, scoped to their own organization ----
CREATE POLICY lesson_plan_library_admin_manage
ON storage.objects
FOR ALL
USING (
    bucket_id = 'lesson-plan-library'
    AND public.is_admin()
    AND (storage.foldername(name))[1]::uuid = public.current_organization_id()
)
WITH CHECK (
    bucket_id = 'lesson-plan-library'
    AND public.is_admin()
    AND (storage.foldername(name))[1]::uuid = public.current_organization_id()
);

-- ---- Teacher: view only, and only the source file behind an approved
-- entry (matches the lpl_teacher_view_approved table policy) ----
CREATE POLICY lesson_plan_library_teacher_view
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'lesson-plan-library'
    AND public.is_teacher()
    AND (storage.foldername(name))[1]::uuid = public.current_organization_id()
    AND name IN (
        SELECT storage_path FROM lesson_plan_library
        WHERE review_status = 'APPROVED' AND organization_id = public.current_organization_id()
    )
);

-- ============================================================
-- Note: the bucket is private (public = false). The app never links
-- directly to a storage URL — it always resolves a short-lived signed URL
-- server-side (see src/lib/actions/lesson-plan-library.ts).
-- ============================================================

-- ============================================================
-- END 024
-- ============================================================
