import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/guard";
import AdminNavbar from "@/components/admin/navbar";

export default async function AdminLayout({ children }) {
  const user = await getAuthUser();
  const roles = user?.roles || [];
  const allowed = roles.some((r) => ["admin", "hr", "manager"].includes(r));
  if (!allowed) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100">
      <AdminNavbar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
