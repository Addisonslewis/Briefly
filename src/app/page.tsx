"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { DigestDemo } from "@/components/digest-demo";

const isPaid = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === "true";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-100 via-blue-100 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4">
      {/* ── Hero ── */}
      <section className="w-full max-w-2xl space-y-8 pt-16 pb-12">
        <div className="text-center space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-400 shadow-lg shadow-sky-400/25">
            <svg aria-hidden="true" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" />
              <path d="M15 18h-5" />
              <path d="M10 6h8v4h-8V6Z" />
            </svg>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground">
            Briefly.
          </h1>
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="space-y-2 text-base sm:text-lg text-muted-foreground leading-relaxed">
              <p>AI reads your feed.</p>
              <p>Briefly emails you the highlights.</p>
              <p>Save yourself an hour of scrolling.</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-2">
              Read your feed. Briefly.
            </h2>
          </div>

          {/* Powered by Claude badge */}
          <div className="flex justify-center pt-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-700 ring-1 ring-orange-200">
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              POWERED BY CLAUDE
            </span>
          </div>
        </div>

        {/* Hero CTA */}
        <div className="space-y-3 text-center">
          <button
            onClick={() => signIn("twitter", { callbackUrl: "/onboarding" })}
            className="group w-full max-w-sm mx-auto rounded-xl bg-foreground px-6 py-4 text-base font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary active:scale-[0.98] flex items-center justify-center gap-3"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {isPaid ? "Get your first week free" : "Get your free daily digest"}
          </button>
          <p className="text-sm text-muted-foreground">
            Sign in with X today.
          </p>
        </div>
      </section>

      {/* ── Digest Demo ── */}
      <section className="w-full max-w-2xl pb-12">
        <div className="relative">
          <DigestDemo />
          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/90 to-transparent rounded-b-2xl pointer-events-none" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          This lands in your inbox every morning around 6 AM ET.
        </p>
      </section>

      {/* ── Mid-page CTA ── */}
      <section className="w-full max-w-sm pb-16 text-center">
        <button
          onClick={() => signIn("twitter", { callbackUrl: "/onboarding" })}
          className="w-full rounded-xl bg-primary px-6 py-4 text-base font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {isPaid ? "Get your first week free" : "Get your free daily digest"}
        </button>
        <p className="text-sm text-muted-foreground mt-3">
          Sign in with X today.
        </p>
      </section>

      {/* ── How It Works ── */}
      <section className="w-full max-w-2xl pb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: 1, title: "Connect", desc: "Sign in with X so we can see your feed." },
            { step: 2, title: "AI Curates", desc: "Claude reads thousands of posts and picks what matters to you." },
            { step: 3, title: "You Read", desc: "A concise digest hits your inbox every morning around 6 AM ET." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-border/50 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
                {step}
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What You Get ── */}
      <section className="w-full max-w-2xl pb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">What You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature checklist */}
          <div className="space-y-4">
            {[
              "Top Story with bull/bear perspectives",
              "Professional Pulse — industry trends that affect you",
              "X-Factor — the wildcard you'd have missed",
              "Source links so you can dive deeper",
              "Personalized to your keywords & interests",
              "Delivered every morning around 6 AM ET",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <svg aria-hidden="true" className="h-5 w-5 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Mini digest snippet */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Sample Section
            </p>
            <div className="mb-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">X-Factor</p>
              <h4 className="text-sm font-bold text-foreground leading-snug mb-1">
                NASA Partners with SpaceX on Lunar Gateway Module
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A surprise contract award positions SpaceX to build the crew habitat for Artemis missions, disrupting established aerospace primes...
              </p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">@NASA</span>
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">@SpaceX</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="w-full max-w-2xl pb-16">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">What People Are Saying</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-border/50">
            <p className="text-sm text-foreground italic leading-relaxed">
              &ldquo;I save 30 minutes every morning. Briefly catches things I would have completely missed.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-medium">@SethCLewis</p>
          </div>
          <div className="rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-border/50">
            <p className="text-sm text-foreground italic leading-relaxed">
              &ldquo;The perspective bullets are genius. Bull, bear, founder — it&apos;s like having three analysts in my inbox.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-medium">@BenPinoli</p>
          </div>
          <div className="rounded-xl bg-white px-5 py-6 shadow-sm ring-1 ring-border/50">
            <p className="text-sm text-foreground italic leading-relaxed">
              &ldquo;Finally, a news digest that actually understands what I care about. Setup took less than a minute.&rdquo;
            </p>
            <p className="text-xs text-muted-foreground mt-3 font-medium">@ScottLewis</p>
          </div>
        </div>
      </section>

      {/* ── Pricing + Final CTA ── */}
      <section className="w-full max-w-md pb-16 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-border/50">
          {isPaid ? (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Simple Pricing</h2>
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-4xl font-bold text-foreground">$8</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-primary font-medium mb-6">7-day free trial, then billed monthly</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-2">Get Started</h2>
              <p className="text-sm text-primary font-medium mb-6">Free while in beta</p>
            </>
          )}

          <div className="space-y-3 text-left mb-8">
            {[
              "Daily AI-curated digest from your X feed",
              "Personalized topics & keywords",
              "Multi-perspective analysis on every story",
              "Delivered to your inbox every morning",
              ...(isPaid ? ["Cancel anytime"] : []),
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <svg aria-hidden="true" className="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => signIn("twitter", { callbackUrl: "/onboarding" })}
            className="w-full rounded-xl bg-primary px-6 py-4 text-base font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98]"
          >
            {isPaid ? "Get your first week free" : "Get your free daily digest"}
          </button>
          <p className="text-xs text-muted-foreground mt-3">
            Sign in with X to get started.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full max-w-2xl pb-8 text-center space-y-2">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
            <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Powered by Claude
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your data is never stored or shared. We use official APIs only.
        </p>
        <div className="flex justify-center gap-3 text-xs">
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
          <span className="text-muted-foreground/50">&middot;</span>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Briefly. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
