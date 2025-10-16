import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#151515]">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-10">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-semibold tracking-[0.35em] text-neutral-600">
          ZALIENT
          <span className="h-1 w-1 rounded-full bg-[#151515]" />
          PRODUCTIVITY
        </div>

        <h1 className="text-center font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          A calmer way to shape your team&rsquo;s best work.
        </h1>

        <p className="mt-6 max-w-2xl text-center font-body text-base leading-7 text-neutral-600 sm:text-lg">
          Zalient Productivity keeps strategy, projects, and rituals in one serene workspace. Sign in to
          continue where you left off or create an account to start orchestrating clarity today.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-full bg-[#151515] px-8 py-3 font-semibold text-white shadow-[0_18px_30px_rgba(21,21,21,0.18)] transition hover:shadow-[0_22px_36px_rgba(21,21,21,0.22)]"
          >
            Create account
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-full border border-[#E8E2D7] px-8 py-3 font-semibold text-neutral-600 transition hover:bg-[#F7F5F0]"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-12 text-center text-xs font-body uppercase tracking-[0.35em] text-neutral-400">
          Crafted for teams who prefer signal over noise.
        </p>
      </div>
    </div>
  );
}
