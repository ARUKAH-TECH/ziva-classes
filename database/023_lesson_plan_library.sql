-- ============================================================
-- 023 — LESSON PLAN REFERENCE LIBRARY
-- ============================================================
-- A bank of pre-written GES weekly lesson-plan content (imported from a
-- large external corpus of real lesson-plan documents — see
-- scripts/import-lesson-plan-library.ts) that a teacher can pick from when
-- filling out /teacher/lesson-notes, instead of typing every GES field
-- from scratch. Mirrors the GES field shape already used by lesson_notes
-- (019_ges_lesson_plan_format.sql).
--
-- The source corpus is inconsistent (see the import script for the full
-- story), so entries are extracted best-effort and only exposed to
-- teachers once review_status = 'APPROVED' — either because the import
-- was confident enough to auto-approve, or because an admin reviewed and
-- approved it at /admin/lesson-plan-library. A teacher never sees
-- PENDING_REVIEW/REJECTED content.
--
-- term_number is deliberately NOT a foreign key to terms — terms.name is
-- free text with no numeric column, so "which term" is resolved at query
-- time by extracting the leading digit from the caller's chosen term name.

CREATE TYPE library_review_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE lesson_plan_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    term_number SMALLINT NOT NULL,
    academic_level_id UUID REFERENCES academic_levels(id) ON DELETE SET NULL,
    academic_level_raw VARCHAR(100) NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    subject_raw VARCHAR(200) NOT NULL,

    week_number SMALLINT,
    week_label VARCHAR(50),
    week_ending DATE,
    topic VARCHAR(300),

    strand VARCHAR(200),
    sub_strand VARCHAR(200),
    indicator VARCHAR(100),
    content_standard TEXT,
    performance_indicator TEXT,
    core_competencies TEXT,
    keywords TEXT,
    teaching_learning_resources TEXT,
    reference TEXT,
    phase1_starter TEXT,
    phase2_main TEXT,
    phase3_reflection TEXT,
    remarks TEXT,

    source_file_path TEXT NOT NULL,
    storage_path TEXT,
    extraction_method VARCHAR(20) NOT NULL,
    review_status library_review_status NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (organization_id, source_file_path, term_number, subject_raw, week_number)
);

CREATE INDEX idx_lpl_org_lookup
    ON lesson_plan_library(organization_id, academic_level_id, subject_id, term_number, review_status);

ALTER TABLE lesson_plan_library ENABLE ROW LEVEL SECURITY;

-- Admin: full management, org-scoped — this is how imported entries get
-- reviewed/approved/edited at /admin/lesson-plan-library.
CREATE POLICY lpl_admin_manage
ON lesson_plan_library
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
)
WITH CHECK (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

-- Teacher: read-only, and only entries an admin has approved.
CREATE POLICY lpl_teacher_view_approved
ON lesson_plan_library
FOR SELECT
USING (
    public.is_teacher()
    AND organization_id = public.current_organization_id()
    AND review_status = 'APPROVED'
);

-- ============================================================
-- END 023
-- ============================================================
