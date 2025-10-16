import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-neutral-50 to-white text-neutral-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-semibold">
              Z
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Zalient Productivity</p>
              <p className="text-xs text-neutral-500 uppercase tracking-[0.2em]">Premium Suite</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
            <a href="#confidence" className="hover:text-neutral-900 transition-colors">Confidence</a>
            <a href="#stories" className="hover:text-neutral-900 transition-colors">Stories</a>
            <a href="#pricing" className="hover:text-neutral-900 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex px-5 py-2 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex px-6 py-2.5 rounded-full bg-neutral-900 text-white font-medium shadow-lg shadow-neutral-900/20 hover:shadow-neutral-900/30 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 items-center gap-16">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold uppercase tracking-[0.3em]">
              Premium
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              Productivity
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight">
              Elevate your workflow with a productivity suite designed for discerning teams.
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              Zalient Productivity blends minimalist design with powerful automation. Craft workflows, orchestrate knowledge, and synchronize progress across your organization with effortless precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-neutral-900 text-white font-semibold shadow-md shadow-neutral-900/20 hover:shadow-lg hover:shadow-neutral-900/25 transition"
              >
                Start your premium trial
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-neutral-200 text-neutral-800 font-semibold hover:bg-neutral-100 transition"
              >
                Explore dashboard
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-6">
              <div>
                <p className="text-3xl font-semibold">82%</p>
                <p className="text-sm text-neutral-500">Average increase in team velocity</p>
              </div>
              <div>
                <p className="text-3xl font-semibold">2.5M</p>
                <p className="text-sm text-neutral-500">Automations executed monthly</p>
              </div>
              <div>
                <p className="text-3xl font-semibold">128+</p>
                <p className="text-sm text-neutral-500">Enterprise integrations</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-neutral-200 blur-3xl opacity-60" aria-hidden />
            <div className="relative rounded-3xl border border-neutral-200 bg-white p-8 shadow-2xl shadow-neutral-900/10">
              <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
                <div className="space-y-1">
                  <p className="text-sm text-neutral-500">Intelligence Dashboard</p>
                  <p className="text-lg font-semibold">Zalient Command Center</p>
                </div>
                <div className="flex -space-x-3">
                  <span className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-medium border-4 border-white">
                    A
                  </span>
                  <span className="w-10 h-10 rounded-full bg-neutral-800 text-white flex items-center justify-center text-sm font-medium border-4 border-white">
                    B
                  </span>
                </div>
              </div>
              <div className="grid gap-6 pt-6">
                <div className="rounded-2xl bg-neutral-900 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-300">Focus Mode</p>
                      <p className="text-2xl font-semibold">Deep Work Sequence</p>
                    </div>
                    <div className="px-4 py-1 rounded-full bg-white/10 text-xs uppercase tracking-[0.3em]">
                      Active
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-400">Session</p>
                      <p className="text-lg font-medium">45 min</p>
                    </div>
                    <div>
                      <p className="text-neutral-400">Progress</p>
                      <p className="text-lg font-medium">78%</p>
                    </div>
                    <div>
                      <p className="text-neutral-400">Focus</p>
                      <p className="text-lg font-medium">High</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-neutral-700">Workflow Optimizer</p>
                    <span className="text-xs text-neutral-500">Revision 5.2</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      {
                        label: "Strategic Planning",
                        detail: "Executive sync with OKR alignment",
                        fill: "w-[86%]",
                      },
                      {
                        label: "Launch Operations",
                        detail: "Auto-triggered QA + release gates",
                        fill: "w-[72%]",
                      },
                      {
                        label: "Client Success",
                        detail: "Personalized touchpoints automated",
                        fill: "w-[94%]",
                      },
                    ].map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <p className="font-medium text-neutral-800">{item.label}</p>
                          <span className="text-neutral-400">{item.detail}</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                          <div className={`h-full rounded-full bg-neutral-900 ${item.fill}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-[0.4em]">Crafted for precision</p>
            <h2 className="text-4xl font-semibold tracking-tight">
              Enterprise-grade control, delivered with boutique simplicity.
            </h2>
            <p className="text-neutral-600 text-lg leading-relaxed">
              From executive dashboards to individual focus rituals, Zalient Productivity orchestrates every layer of your workflow with a refined balance of clarity and intelligence.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            {[
              {
                title: "Adaptive Workflows",
                description:
                  "Designer-grade automation builder with contextual intelligence, crafted to evolve with your team.",
                points: [
                  "Drag-and-refine blueprinting",
                  "Executive review modes",
                  "Cross-department alignment",
                ],
              },
              {
                title: "Human + AI Collaboration",
                description:
                  "Balance human judgment with predictive insights. Delegate repetitious work to Zalient Copilot.",
                points: [
                  "Predictive delegation",
                  "Executive briefing digest",
                  "Real-time coaching cues",
                ],
              },
              {
                title: "Confidence Layer",
                description:
                  "Granular analytics that reveal the momentum of your organization in premium clarity.",
                points: [
                  "Time-to-impact radars",
                  "Precision trend lines",
                  "Auto-generated executive reports",
                ],
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-neutral-200 bg-white p-10 shadow-lg shadow-neutral-900/5"
              >
                <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-neutral-600 leading-relaxed mb-6">{feature.description}</p>
                <ul className="space-y-3 text-sm text-neutral-500">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-neutral-900 text-white text-xs">
                        ●
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Confidence */}
      <section id="confidence" className="py-24 px-6 bg-neutral-900 text-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">Confidence layer</p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight">
              See every signal that matters. React before competitors even notice.
            </h2>
            <p className="text-white/70 leading-relaxed">
              Zalient Confidence scores benchmark performance in real time. Executive dashboards surface actionable insights with forensic clarity—built for leaders who demand precision.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 pt-4">
              <div className="p-6 rounded-2xl bg-white/10 border border-white/10">
                <p className="text-sm text-white/60">Leadership Clarity Index</p>
                <p className="text-3xl font-semibold">97.4</p>
                <p className="text-xs text-white/40">Global enterprise percentile rank</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/10 border border-white/10">
                <p className="text-sm text-white/60">Predictive Accuracy</p>
                <p className="text-3xl font-semibold">92%</p>
                <p className="text-xs text-white/40">Forecast alignment over 6 months</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-white/10 blur-3xl" aria-hidden />
            <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Executive Signal</p>
                <span className="text-xs text-white/40">Auto-updated</span>
              </div>
              <div className="mt-10 space-y-8">
                <div className="grid grid-cols-4 gap-4 text-sm text-white/70">
                  <div className="col-span-2">
                    <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Momentum</p>
                    <p className="text-2xl font-semibold text-white">+18.4%</p>
                    <p>Quarterly execution velocity uplift</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Confidence</p>
                    <p className="text-2xl font-semibold text-white">96%</p>
                    <p>Signal coherency</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Priority</p>
                    <p className="text-2xl font-semibold text-white">Tier 1</p>
                    <p>Immediate action</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                  <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-3">precision alert</p>
                  <p className="text-lg font-semibold text-white mb-2">Customer delight dip in EMEA</p>
                  <p className="text-white/70 text-sm">
                    Suggested response: Trigger empathy audit workflow, activate tiered support escalation, and deliver personalized feedback capsule within 4 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories */}
      <section id="stories" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-[0.4em]">Client narratives</p>
              <h2 className="text-4xl font-semibold tracking-tight">
                Forward-thinking teams craft their next chapter with Zalient.
              </h2>
            </div>
            <Link
              href="/auth/signup"
              className="self-start inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 border-b border-neutral-900 pb-1"
            >
              Join premium waitlist
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "Zalient is the first platform our exec team truly aligns around. Insights surface before we even ask. It's the quiet force behind every strategic decision now.",
                name: "Amelia Reyes",
                role: "Chief Operating Officer, Meridian Collective",
              },
              {
                quote:
                  "We sunset three legacy systems within 90 days. The clarity, the tonal restraint, the velocity—Zalient is luxury-grade productivity.",
                name: "Jonah Park",
                role: "Head of Product, Lumen Studios",
              },
              {
                quote:
                  "Our focus rituals finally sync with our strategy framework. Zalient choreographs human rhythm with machine intelligence beautifully.",
                name: "Priya Menon",
                role: "Director of Strategy, Northbridge",
              },
            ].map((story) => (
              <div key={story.name} className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-md shadow-neutral-900/5">
                <p className="text-neutral-600 leading-relaxed mb-6">“{story.quote}”</p>
                <div className="pt-6 border-t border-neutral-100">
                  <p className="font-semibold">{story.name}</p>
                  <p className="text-sm text-neutral-500">{story.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-[0.4em]">Memberships</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Select the signature experience that resonates with your organization.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Curated",
                price: "$79",
                cadence: "per seat / month",
                description: "Premium foundations for focused teams seeking elegance and control.",
                badge: "Most loved",
                features: [
                  "Focus & ritual designer",
                  "Unified workspace architecture",
                  "Zalient Copilot (essentials)",
                  "Executive alignment insights",
                ],
              },
              {
                title: "Iconic",
                price: "$149",
                cadence: "per seat / month",
                description: "Signature intelligence layer with adaptive automations and precision analytics.",
                badge: "Signature",
                highlighted: true,
                features: [
                  "All curated features",
                  "Adaptive workflow automation",
                  "Confidence layer dashboards",
                  "Predictive executive briefings",
                  "Enterprise-grade security envelope",
                ],
              },
              {
                title: "Legacy",
                price: "Request",
                cadence: "custom engagement",
                description: "Bespoke orchestration with dedicated strategy partners and private deployments.",
                badge: "Invitation",
                features: [
                  "On-premise orchestration",
                  "Private LLM tuning",
                  "Personal strategy concierge",
                  "White-glove migration",
                ],
              },
            ].map((tier) => (
              <div
                key={tier.title}
                className={`relative rounded-3xl border ${
                  tier.highlighted
                    ? "border-neutral-900 bg-neutral-900 text-white shadow-2xl shadow-neutral-900/30"
                    : "border-neutral-200 bg-white text-neutral-900 shadow-lg shadow-neutral-900/5"
                } p-10 space-y-6`}
              >
                {tier.badge && (
                  <span
                    className={`absolute -top-4 left-8 inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.3em] ${
                      tier.highlighted ? "bg-white/10 text-white" : "bg-neutral-900 text-white"
                    }`}
                  >
                    {tier.badge}
                  </span>
                )}
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">{tier.title}</h3>
                  <p className={`text-sm ${tier.highlighted ? "text-white/70" : "text-neutral-500"}`}>{tier.description}</p>
                </div>
                <div>
                  <p className="text-4xl font-semibold">{tier.price}</p>
                  <p className={`text-sm ${tier.highlighted ? "text-white/60" : "text-neutral-500"}`}>
                    {tier.cadence}
                  </p>
                </div>
                <ul className="space-y-3 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <span
                        className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold ${
                          tier.highlighted ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
                        }`}
                      >
                        ✓
                      </span>
                      <span className={tier.highlighted ? "text-white/80" : "text-neutral-600"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`inline-flex items-center justify-center w-full px-6 py-3 mt-4 rounded-full font-semibold transition ${
                    tier.highlighted
                      ? "bg-white text-neutral-900 hover:bg-neutral-100"
                      : "border border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  Choose {tier.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-12">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-sm font-semibold">
                Z
              </div>
              <div>
                <p className="font-semibold">Zalient Productivity</p>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Signature Edition</p>
              </div>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Crafted for executives, creatives, and teams who demand the pinnacle of productivity elegance.
            </p>
            <div className="flex gap-4 text-sm text-neutral-500">
              <a href="#" className="hover:text-neutral-900 transition">Privacy</a>
              <a href="#" className="hover:text-neutral-900 transition">Terms</a>
              <a href="#" className="hover:text-neutral-900 transition">Security</a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-neutral-900 uppercase tracking-[0.3em]">Product</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-neutral-900 transition">Overview</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Automation Suite</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Experience Design</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Integrations</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-neutral-900 uppercase tracking-[0.3em]">Company</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-neutral-900 transition">Studio</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Press</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Careers</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Contact</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-neutral-900 uppercase tracking-[0.3em]">Connect</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-neutral-900 transition">LinkedIn</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Twitter</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Vimeo</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition">Newsletter</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-neutral-200 py-6 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} Zalient Productivity. Crafted in collaborative studios worldwide.
        </div>
      </footer>
    </div>
  );
}
