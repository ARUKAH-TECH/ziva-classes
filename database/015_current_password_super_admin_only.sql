-- ============================================================
-- 015 — SUPER-ADMIN-ONLY CURRENT PASSWORD VISIBILITY
-- ============================================================
-- Stores each account's current plaintext password so the Super Admin can
-- look it up later, instead of only ever being able to reset it. This is a
-- deliberate, explicit security tradeoff the school's owner asked for after
-- being told the alternative (Supabase Auth's hashed password) can never be
-- read back by anyone, including the app itself.
--
-- Kept safe from accidental exposure by convention, not by column-level
-- RLS (this schema doesn't use column privileges elsewhere): no query
-- anywhere in the app selects "*" from users, and the only code path that
-- selects this column is getCurrentPassword (src/lib/actions/user-admin.ts),
-- gated by requireSuperAdmin — not requireAdmin.

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_password TEXT;
