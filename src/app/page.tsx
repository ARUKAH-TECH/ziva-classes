import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_HOME_PATH } from "@/lib/permissions/roles";

export default async function RootPage() {
  const user = await getCurrentUser(); // redirects to /login if signed out
  redirect(ROLE_HOME_PATH[user.role]);
}
