import Link from "next/link";

export default function PrivacyPage() {
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground">Last updated: March 16, 2026</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Briefly (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates gobriefly.app. Here&apos;s how we handle your data.
          </p>
        </div>

        {/* Content sections */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-3">What we collect</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                Your X (Twitter) account info (name, handle, profile image) via OAuth
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                Your email address for digest delivery
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                Your preferences (keywords, topics, signal description)
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-3">What we do with it</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Read your X feed to generate your daily digest
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Email you that digest via Resend
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Process your feed through Anthropic&apos;s Claude AI for summarization
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-emerald-50 p-5 shadow-sm ring-1 ring-emerald-200">
            <h2 className="text-sm font-semibold text-emerald-800 mb-3">What we don&apos;t do</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5 text-sm text-emerald-700">
                <svg aria-hidden="true" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                We never store your raw feed data &mdash; it&apos;s processed and discarded
              </li>
              <li className="flex items-start gap-2.5 text-sm text-emerald-700">
                <svg aria-hidden="true" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                We never sell, share, or rent your personal information to third parties
              </li>
              <li className="flex items-start gap-2.5 text-sm text-emerald-700">
                <svg aria-hidden="true" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                We never post to your X account
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">Third-party services</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use: Anthropic (AI processing), Resend (email delivery), Stripe (payments), Vercel (hosting), and SocialData (feed access). Each has its own privacy policy.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <h2 className="text-sm font-semibold text-foreground mb-2">Data retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Digest summaries are stored for your history. You can delete your account and all associated data by emailing support@gobriefly.app.
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
