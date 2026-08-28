import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      role={user.role}
      orgName={user.orgName}
      userLabel={`${user.firstName} ${user.lastName}`}
      roleLabel="Student"
    >
      {children}
    </DashboardShell>
  );
}
