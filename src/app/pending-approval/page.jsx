import { redirect } from "next/navigation";
import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#151515] mb-4">
          Profile Submitted Successfully!
        </h1>

        <p className="text-neutral-600 mb-6">
          Your onboarding profile has been submitted and is pending admin approval.
          An administrator will review your information and assign appropriate roles and permissions.
        </p>

        <div className="space-y-4">
          <div className="bg-neutral-50 p-4 rounded-lg">
            <h3 className="font-semibold text-[#151515] mb-2">What happens next?</h3>
            <ul className="text-sm text-neutral-600 space-y-1 text-left">
              <li>• Admin reviews your profile and company information</li>
              <li>• Appropriate roles and permissions are assigned</li>
              <li>• You'll receive access to the admin dashboard</li>
              <li>• You can start using the system features</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <Link
              href="/auth/login"
              className="flex-1 bg-[#151515] text-white py-3 rounded-lg font-semibold hover:bg-neutral-800 transition"
            >
              Back to Login
            </Link>
            <Link
              href="/"
              className="flex-1 border border-[#E8E2D7] text-[#151515] py-3 rounded-lg font-semibold hover:bg-neutral-50 transition"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
