-- ============================================================
-- 013 — CLASS MATERIALS LIST + MATERIALS FEES
-- ============================================================
-- A per-class list of required books/items (visible to parents), and a
-- billable "materials fee" that — unlike existing subject fees — applies to
-- every student enrolled in the class as a whole, not one specific subject.

CREATE TABLE IF NOT EXISTS class_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_materials_class ON class_materials(class_id);

-- fee_structures previously required class_subject_id (every fee was tied
-- to one subject). A materials fee is class-wide, so class_subject_id must
-- become optional and a class_id + fee_type distinguish the two shapes.
ALTER TABLE fee_structures ALTER COLUMN class_subject_id DROP NOT NULL;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS fee_type VARCHAR(30) NOT NULL DEFAULT 'SUBJECT';
ALTER TABLE fee_structures ADD CONSTRAINT fee_structures_scope_check CHECK (
  (fee_type = 'SUBJECT' AND class_subject_id IS NOT NULL AND class_id IS NULL) OR
  (fee_type = 'MATERIALS' AND class_id IS NOT NULL AND class_subject_id IS NULL)
);

-- RLS: same shape as class_subjects — org members can read, only admins
-- can manage.
ALTER TABLE class_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_materials_org_access
ON class_materials
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY class_materials_admin_manage
ON class_materials
FOR ALL
USING (
    public.is_admin()
    AND organization_id = public.current_organization_id()
);
