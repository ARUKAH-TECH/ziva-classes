-- ============================================================
-- 018 — LESSON NOTES
-- ============================================================
-- Teachers submit lesson notes for a class/subject/term; admin reviews them
-- (printable, with an optional correction comment) and marks each one
-- Verified or Not Complete.

CREATE TYPE lesson_note_status AS ENUM ('PENDING', 'VERIFIED', 'NOT_COMPLETE');

CREATE TABLE lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,

    week_of DATE,
    topic VARCHAR(200) NOT NULL,
    objectives TEXT,
    content TEXT NOT NULL,

    status lesson_note_status NOT NULL DEFAULT 'PENDING',
    admin_comment TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lesson_notes_teacher ON lesson_notes(teacher_id);
CREATE INDEX idx_lesson_notes_org ON lesson_notes(organization_id);

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Admin: full access, org-scoped — this is how it "reflects in the Super
-- Admin's portal" for printing/correcting/verifying.
CREATE POLICY lesson_notes_admin_manage
ON lesson_notes
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);

-- Teacher: full access to their own notes only. Column-level restriction
-- (a teacher can't set status/admin_comment/reviewed_by themselves) is
-- enforced by the server actions, not RLS — the same convention already
-- used elsewhere in this schema (e.g. current_password, payments).
CREATE POLICY lesson_notes_teacher_manage
ON lesson_notes
FOR ALL
USING (
    teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    teacher_id IN (
        SELECT id
        FROM teacher_profiles
        WHERE user_id = auth.uid()
    )
);
