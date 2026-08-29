-- ============================================================
-- 014 — AD-HOC (INDIVIDUAL) STUDENT CHARGES
-- ============================================================
-- student_charges previously required a fee_structure_id, so an admin
-- could only bill a student via the bulk "generate charges for term" flow.
-- There was no way to add a one-off charge to a single student (a late
-- registration fee, a damaged-book fine, etc.). fee_structure_id becomes
-- optional; description carries the label when there's no fee_structure to
-- derive one from.

ALTER TABLE student_charges ALTER COLUMN fee_structure_id DROP NOT NULL;
ALTER TABLE student_charges ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE student_charges ADD CONSTRAINT student_charges_labeled
  CHECK (fee_structure_id IS NOT NULL OR description IS NOT NULL);
