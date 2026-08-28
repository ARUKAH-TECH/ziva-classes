-- ============================================================
-- ZIVA ONLINE & SPECIAL CLASSES
-- 002 — SCHEMA AMENDMENTS
-- ============================================================
-- Additive only. database/schema.sql is left untouched.
-- Rationale for each change is in docs/ (architecture plan) —
-- summarized inline below.
-- ============================================================

-- ============================================================
-- 1. ORGANIZATION SETTINGS
-- Requirement: org settings (social handles, toggles) must be
-- configurable, not hard-coded. JSONB avoids a migration per toggle.
-- ============================================================

ALTER TABLE organizations ADD COLUMN social_media JSONB DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organizations.settings IS
  'Configurable org policy toggles, e.g. {"parent_can_edit_location": false, '
  '"parent_can_edit_photo": false, "ranking_enabled_default": false, '
  '"currency_symbol": "GHS"}';

-- ============================================================
-- 2. PHOTO STORAGE PATH CLARITY
-- Requirement: student/user photos must be protected, not public.
-- "*_url" implied a public URL; rename to "*_path" (a Storage object
-- path) — the app resolves a short-lived signed URL at render time.
-- ============================================================

ALTER TABLE student_profiles RENAME COLUMN passport_photo_url TO passport_photo_path;
ALTER TABLE users RENAME COLUMN profile_photo_url TO profile_photo_path;

-- organizations.logo_url is intentionally left as-is — the org logo is public.

-- ============================================================
-- 3. CONFIGURABLE GRADING SCALES (one scale per academic level)
-- Requirement §22: grading system must be admin-configurable, not
-- hard-coded. Ghana's Primary/JHS (BECE-style) and SHS (WASSCE-style)
-- commonly use different grade bands, so scales are per academic_level.
-- ============================================================

CREATE TABLE grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    academic_level_id UUID NOT NULL REFERENCES academic_levels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grade_bands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grading_scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
    min_score DECIMAL(6,2) NOT NULL,
    max_score DECIMAL(6,2) NOT NULL,
    grade_label VARCHAR(10) NOT NULL,
    grade_point DECIMAL(4,2),
    remark VARCHAR(100),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (max_score >= min_score)
);

CREATE INDEX idx_grading_scales_level ON grading_scales(academic_level_id);
CREATE INDEX idx_grade_bands_scale ON grade_bands(grading_scale_id);

ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY grading_scales_org_view
ON grading_scales
FOR SELECT
USING (organization_id = public.current_organization_id());

CREATE POLICY grading_scales_admin_manage
ON grading_scales
FOR ALL
USING (public.is_admin() AND organization_id = public.current_organization_id())
WITH CHECK (public.is_admin() AND organization_id = public.current_organization_id());

CREATE POLICY grade_bands_org_view
ON grade_bands
FOR SELECT
USING (
    grading_scale_id IN (
        SELECT id FROM grading_scales
        WHERE organization_id = public.current_organization_id()
    )
);

CREATE POLICY grade_bands_admin_manage
ON grade_bands
FOR ALL
USING (
    public.is_admin()
    AND grading_scale_id IN (
        SELECT id FROM grading_scales
        WHERE organization_id = public.current_organization_id()
    )
);

-- ============================================================
-- 4. PARENT CHANGE REQUESTS (approval queue)
-- Requirement §9/§13: parents may update a child's photo/location only
-- if the org's permission policy allows it. The supplied RLS gives
-- parents view-only access with no write path at all. Per the chosen
-- design, parent edits go into a pending-approval queue rather than
-- writing directly.
-- ============================================================

CREATE TYPE request_change_type AS ENUM ('PHOTO', 'LOCATION');
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE parent_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
    request_type request_change_type NOT NULL,
    payload JSONB NOT NULL,
    status request_status NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parent_change_requests_student ON parent_change_requests(student_id);
CREATE INDEX idx_parent_change_requests_parent ON parent_change_requests(parent_id);
CREATE INDEX idx_parent_change_requests_status ON parent_change_requests(status);

ALTER TABLE parent_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_change_requests_parent_insert
ON parent_change_requests
FOR INSERT
WITH CHECK (
    parent_id IN (SELECT id FROM parent_profiles WHERE user_id = auth.uid())
    AND student_id IN (
        SELECT student_id FROM parent_students
        WHERE parent_id IN (SELECT id FROM parent_profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY parent_change_requests_parent_select
ON parent_change_requests
FOR SELECT
USING (
    parent_id IN (SELECT id FROM parent_profiles WHERE user_id = auth.uid())
);

CREATE POLICY parent_change_requests_admin_manage
ON parent_change_requests
FOR ALL
USING (
    public.is_admin()
    AND student_id IN (
        SELECT id FROM student_profiles
        WHERE organization_id = public.current_organization_id()
    )
);

-- Approving a request (writing the real student_profiles/student_locations
-- row) is done via a SECURITY DEFINER RPC, not direct client UPDATE — see
-- docs/ for the function contract. This keeps the audit trail (audit_logs)
-- consistent and lets the RPC apply the org's parent_can_edit_* setting.

-- ============================================================
-- 5. PARENT-FACING VISIBILITY ON EDUCATIONAL SUPPORT DATA
-- Requirement §26: internal administrative notes must not be exposed to
-- parents, but the supplied schema has no flag to distinguish them.
-- ============================================================

ALTER TABLE student_needs ADD COLUMN visible_to_parent BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE interventions ADD COLUMN visible_to_parent BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- 6. TERMINAL REPORT IMMUTABILITY (snapshot on publish)
-- Requirement §30: published reports must not silently change when
-- underlying records (scores, attendance, etc.) are edited later.
-- ============================================================

ALTER TABLE terminal_reports ADD COLUMN snapshot_data JSONB;
ALTER TABLE terminal_reports ADD COLUMN sessions_expected INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_present INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_absent INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_late INTEGER;
ALTER TABLE terminal_reports ADD COLUMN sessions_excused INTEGER;
ALTER TABLE terminal_reports ADD COLUMN attendance_percentage NUMERIC(5,2);

COMMENT ON COLUMN terminal_reports.snapshot_data IS
  'Fully-rendered report payload frozen at publish time (subjects, grades, '
  'comments, attendance counts, performance summary, student/class identity '
  'at that moment). DRAFT reports compute live; PUBLISHED reports render '
  'from this snapshot only. Re-generating after publish creates a new '
  'version row instead of mutating this one.';

-- Application-layer rule (not enforced by a trigger here, to keep this
-- amendment additive-only): once status = 'PUBLISHED', only the
-- publish/version RPC may write to a terminal_reports row — never a plain
-- client UPDATE. Consider a BEFORE UPDATE trigger enforcing this once the
-- publish RPC is implemented (Phase 7).

-- ============================================================
-- END 002
-- ============================================================
