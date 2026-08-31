-- ============================================================
-- 022 — ACADEMIC LEVEL CODE
-- ============================================================
-- Short admin-set code per academic level (e.g. Primary -> PRI, JHS -> JHS),
-- used to compose the structured student ID (ZIVA/{code}/{yy}/{seq}) —
-- level names are free text the admin already chose, so this can't be
-- reliably auto-abbreviated; the admin sets it once per level in Settings.

ALTER TABLE academic_levels ADD COLUMN code VARCHAR(20);
