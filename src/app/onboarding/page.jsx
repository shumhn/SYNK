import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/guard";
import OnboardingForm from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  // If user already has roles, redirect to admin
  const roles = user?.roles || [];
  if (roles.length > 0) redirect("/admin/users");

  return (
    <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-neutral-600 mb-6">
            ZALIENT
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#151515] mb-2">
            Complete Your Profile
          </h1>
          <p className="text-sm text-neutral-500 font-body">
            Your account is pending approval. Please complete your profile and an admin will review your request.
          </p>
        </div>

        <OnboardingForm user={JSON.parse(JSON.stringify(user))} />
      </div>
    </div>
  );
}
