import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";

const ROLE_LABEL = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      role={user.role}
      orgName={user.orgName}
      userLabel={`${user.firstName} ${user.lastName}`}
      roleLabel={ROLE_LABEL[user.role as "SUPER_ADMIN" | "ADMIN"] ?? user.role}
    >
      {children}
    </DashboardShell>
  );
}
