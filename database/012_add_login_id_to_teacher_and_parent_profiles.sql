-- ============================================================
-- 012 — LOGIN ID FOR TEACHERS AND PARENTS WITHOUT EMAIL
-- ============================================================
-- Mirrors student_profiles.student_number: a stable, human-readable
-- identifier used only when the teacher/parent was created without a real
-- email, so they can sign in with an ID + password via the same
-- synthetic-email pattern as students (see synthEmailForLoginId in
-- src/lib/actions/auth-lookup.ts). Kept separate from teacher_profiles'
-- pre-existing employee_number, which is admin-entered HR data and must
-- stay independently editable without breaking login.

ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS login_id VARCHAR(50);
ALTER TABLE teacher_profiles ADD CONSTRAINT teacher_profiles_login_id_unique UNIQUE (organization_id, login_id);

ALTER TABLE parent_profiles ADD COLUMN IF NOT EXISTS login_id VARCHAR(50);
ALTER TABLE parent_profiles ADD CONSTRAINT parent_profiles_login_id_unique UNIQUE (organization_id, login_id);
