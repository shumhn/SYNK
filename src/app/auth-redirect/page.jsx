import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/guard";

export default async function AuthRedirectPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/auth/login");
  }

  const roles = user?.roles || [];
  if (roles.length === 0) {
    // User has no roles, send to onboarding
    redirect("/onboarding");
  }

  // User has roles, send to admin area
  redirect("/admin");
}
