-- ============================================================
-- 020 — LESSON NOTE DRAFT STATUS
-- ============================================================
-- Lets a teacher save a lesson plan in progress and come back to it later,
-- without it counting as "submitted" (PENDING) and showing up on the
-- admin's review list.

ALTER TYPE lesson_note_status ADD VALUE 'DRAFT';
