-- ============================================================
-- 016 — EXPECTED STUDENT COUNT ON SCHEDULE SLOTS
-- ============================================================
-- class_schedules already captures day/time/location as one editable
-- entry per recurring slot — this adds the last piece requested: how many
-- students the teacher expects to meet at that slot (useful for
-- HOME_SERVICE/off-site slots where actual attendees can be a subset of
-- the full class roster, so it's admin-entered rather than derived).

ALTER TABLE class_schedules ADD COLUMN IF NOT EXISTS student_count INTEGER;
