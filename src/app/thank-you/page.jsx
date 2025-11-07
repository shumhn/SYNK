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

  const displayName = session?.user?.name || jwtPayload?.username || "there";

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-semibold">Thank you for logging in!</h1>
        <p className="text-gray-300">Welcome back, {displayName}. You now have access to your protected resources.</p>
      </div>
    </div>
  );
}
