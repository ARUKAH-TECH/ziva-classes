-- ============================================================
-- 021 — TEACHER FEEDBACK (PARENT -> ADMIN)
-- ============================================================
-- Lets a parent share views/suggestions about a specific teacher (and
-- optionally request a change of teacher) directly to the admin, separate
-- from the existing teacher-authored "Teacher Feedback" (student support
-- notes) feature which flows the other direction.

CREATE TYPE teacher_feedback_status AS ENUM ('NEW', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE teacher_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

    message TEXT NOT NULL,
    request_teacher_change BOOLEAN NOT NULL DEFAULT FALSE,

    status teacher_feedback_status NOT NULL DEFAULT 'NEW',
    admin_response TEXT,
    responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teacher_feedback_org ON teacher_feedback(organization_id);
CREATE INDEX idx_teacher_feedback_parent ON teacher_feedback(parent_id);
CREATE INDEX idx_teacher_feedback_teacher ON teacher_feedback(teacher_id);

ALTER TABLE teacher_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_feedback_admin_manage
ON teacher_feedback
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

CREATE POLICY teacher_feedback_parent_insert
ON teacher_feedback
FOR INSERT
WITH CHECK (
    parent_id IN (
        SELECT id
        FROM parent_profiles
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY teacher_feedback_parent_view
ON teacher_feedback
FOR SELECT
USING (
    parent_id IN (
        SELECT id
        FROM parent_profiles
        WHERE user_id = auth.uid()
    )
);
