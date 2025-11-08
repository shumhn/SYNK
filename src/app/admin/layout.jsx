import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/guard";
import AdminNavbar from "@/components/admin/navbar";
import Heartbeat from "@/components/system/Heartbeat";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminLayout({ children }) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const roles = user?.roles || [];
  if (roles.length === 0) redirect("/onboarding");

  const allowed = roles.some((r) =>
    ["admin", "hr", "manager", "employee"].includes(r)
  );
  if (!allowed) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100">
      <Heartbeat />
      <AdminNavbar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
