// Mirrors the `user_role` enum in database/schema.sql.
// This is a UX convenience layer only — the database RLS policies
// (database/rls_policies.sql + database/003_rls_org_scoping_fix.sql)
// are the real security boundary. Never trust this file alone.

export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  PARENT: "/parent/dashboard",
  STUDENT: "/student/dashboard",
};

// URL prefix each role is allowed to access. Used by middleware.ts to
// bounce a signed-in user out of a portal that isn't theirs.
export const ROLE_PATH_PREFIX: Record<UserRole, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TEACHER: "/teacher",
  PARENT: "/parent",
  STUDENT: "/student",
};

export function isAdminRole(role: UserRole | null | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
