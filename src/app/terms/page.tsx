import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          &larr; Back
        </Link>

        {/* Header card */}
        <div className="mt-6 mb-8 rounded-2xl bg-white p-6 sm:p-8 shadow-lg ring-1 ring-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <svg aria-hidden="true" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Terms of Service</h1>
              <p className="text-xs text-muted-foreground">Last updated: March 16, 2026</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using Briefly, you agree to these terms.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">The service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Briefly reads your X feed, summarizes it with AI, and emails you a daily digest. We aim for 6 AM delivery but don&apos;t guarantee exact timing.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">Your account</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must have a valid X account to use Briefly. You&apos;re responsible for your account credentials. One account per person.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">Free trial &amp; billing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              New users get a 7-day free trial. After that, continued access is $8/month via Stripe. You can cancel anytime &mdash; access continues through the end of your billing period.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">What you get</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-generated summaries based on your feed. Content accuracy depends on what&apos;s in your feed and AI interpretation &mdash; we don&apos;t guarantee factual accuracy of summaries.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
            <h2 className="text-sm font-semibold text-amber-800 mb-2">Limitations</h2>
            <p className="text-sm text-amber-700 leading-relaxed">
              The service is provided &ldquo;as is.&rdquo; We may modify, suspend, or discontinue the service at any time. We&apos;re not liable for missed digests, inaccurate summaries, or service interruptions.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We can terminate accounts that abuse the service. You can delete your account at any time by emailing support@gobriefly.app.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions? Email <a href="mailto:support@gobriefly.app" className="text-primary hover:underline font-medium">support@gobriefly.app</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
