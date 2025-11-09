import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth/guard";
import AdminNavbar from "@/components/admin/navbar";
import Heartbeat from "@/components/system/Heartbeat";
import TwoFABanner from "@/components/system/TwoFABanner";
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

  // Enforce 2FA: admin/hr must have 2FA enabled; if enabled but not verified, show banner
  const requiresTwoFA = roles.some((r) => ["admin", "hr"].includes(r));
  let showTwoFABanner = false;
  if (requiresTwoFA) {
    if (!user.twoFA?.enabled) {
      const returnTo = encodeURIComponent("/admin");
      redirect(`/auth/2fa?setup=1&return=${returnTo}`);
    }
    const cookieStore = await cookies();
    const twoFAVerified = cookieStore.get("2fa_verified")?.value;
    if (!twoFAVerified) showTwoFABanner = true;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100">
      {showTwoFABanner && <TwoFABanner />}
      <Heartbeat />
      <AdminNavbar />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
