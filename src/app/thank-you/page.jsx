import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/nextAuthOptions";
import { verifyToken } from "@/lib/auth/jwt";

export default async function ThankYouPage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const jwtPayload = token ? verifyToken(token) : null;

  if (!session && !jwtPayload) {
    redirect("/auth/login");
  }

  // Redirect to admin area after successful login
  redirect("/admin/users");
}
