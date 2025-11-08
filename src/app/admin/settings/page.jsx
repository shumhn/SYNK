import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-white mb-2">Settings</h1>
        <p className="text-sm text-neutral-400">Manage your account and integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Link
          href="/admin/settings/security"
          className="group p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50 hover:bg-neutral-900 hover:border-neutral-700 transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-white mb-1">Security</h2>
              <p className="text-sm text-neutral-400">
                Manage 2FA, password, and account security settings
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/settings/integrations"
          className="group p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50 hover:bg-neutral-900 hover:border-neutral-700 transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-white mb-1">Integrations</h2>
              <p className="text-sm text-neutral-400">
                Configure Slack, Discord, and other webhook integrations
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
