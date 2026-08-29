-- ============================================================
-- 019 — GES WEEKLY LESSON PLAN FORMAT
-- ============================================================
-- Replaces the generic topic/objectives/content fields with Ghana
-- Education Service's standard weekly lesson plan structure. No production
-- data existed under the old shape yet, so this is a straight replace
-- rather than a data-preserving migration.

ALTER TABLE lesson_notes RENAME COLUMN week_of TO week_ending;

ALTER TABLE lesson_notes DROP COLUMN topic;
ALTER TABLE lesson_notes DROP COLUMN objectives;
ALTER TABLE lesson_notes DROP COLUMN content;

ALTER TABLE lesson_notes ADD COLUMN week_number INTEGER;
ALTER TABLE lesson_notes ADD COLUMN day_name VARCHAR(20);
ALTER TABLE lesson_notes ADD COLUMN lesson_date DATE;
ALTER TABLE lesson_notes ADD COLUMN strand VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN sub_strand VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN indicator VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN content_standard TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN performance_indicator TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN core_competencies TEXT;
ALTER TABLE lesson_notes ADD COLUMN keywords TEXT;
ALTER TABLE lesson_notes ADD COLUMN teaching_learning_resources TEXT;
ALTER TABLE lesson_notes ADD COLUMN reference TEXT;
ALTER TABLE lesson_notes ADD COLUMN phase1_starter TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN phase2_main TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN phase3_reflection TEXT NOT NULL DEFAULT '';
ALTER TABLE lesson_notes ADD COLUMN remarks TEXT;

-- Drop the temporary defaults now that the columns exist — new rows must
-- supply real values (the server action already requires them), the
-- DEFAULT '' above only existed to satisfy NOT NULL on this ALTER itself.
ALTER TABLE lesson_notes ALTER COLUMN strand DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN sub_strand DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN indicator DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN content_standard DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN performance_indicator DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN phase1_starter DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN phase2_main DROP DEFAULT;
ALTER TABLE lesson_notes ALTER COLUMN phase3_reflection DROP DEFAULT;
