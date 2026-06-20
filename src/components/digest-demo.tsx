"use client";

function getTodayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DigestDemo() {
  return (
    <article className="rounded-2xl bg-white p-6 sm:p-8 shadow-lg ring-1 ring-border/50" aria-label="Example email digest">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Example Digest
      </p>

      {/* Mimic email header */}
      <div className="text-center mb-5">
        <h3 className="text-xl font-bold text-foreground">Briefly.</h3>
        <p className="text-xs text-muted-foreground mt-1">{getTodayFormatted()}</p>
      </div>
      <div className="h-px bg-border mb-5" />

      <p className="text-sm text-muted-foreground mb-5">
        Good morning. Here&apos;s what matters today.
      </p>

      {/* Top Story */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Top Story</p>
        <h4 className="text-base font-bold text-foreground leading-snug mb-1.5">
          Pentagon Expands Palantir AI Across Defense Operations
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          The Department of Defense is rolling out Palantir&apos;s Maven Smart System enterprise-wide to accelerate decision-making and improve operational outcomes across all branches.
        </p>

        {/* Perspective bullets */}
        <div className="space-y-2 mb-3">
          <div className="flex gap-2 text-sm">
            <span className="text-primary font-medium shrink-0">Bull:</span>
            <span className="text-muted-foreground">&ldquo;Massive TAM expansion — defense AI spend is just getting started.&rdquo;</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-primary font-medium shrink-0">Bear:</span>
            <span className="text-muted-foreground">&ldquo;Single-vendor lock-in risk; procurement cycles are notoriously slow.&rdquo;</span>
          </div>
        </div>

        {/* Source pills */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">@DefenseOne</span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">@PalantirTech</span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">@BreakingDefense</span>
        </div>
      </div>

      <div className="h-px bg-border mb-5" />

      {/* Professional Pulse */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Professional Pulse</p>
        <h4 className="text-base font-bold text-foreground leading-snug mb-1.5">
          Anthropic Raises $3.5B as Enterprise AI Demand Surges
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Anthropic closed a massive funding round led by Google and Spark Capital, valuing the company at $61B as enterprises race to adopt AI-native workflows.
        </p>
        <div className="space-y-2">
          <div className="flex gap-2 text-sm">
            <span className="text-primary font-medium shrink-0">Bull:</span>
            <span className="text-muted-foreground">&ldquo;Enterprise AI is a winner-take-most market — Anthropic has the safety moat.&rdquo;</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-primary font-medium shrink-0">Bear:</span>
            <span className="text-muted-foreground">&ldquo;$61B valuation needs massive revenue growth to justify — competition is fierce.&rdquo;</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-border mb-5" />

      {/* X-Factor */}
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">X-Factor</p>
        <h4 className="text-base font-bold text-foreground leading-snug mb-1.5">
          Stripe Launches AI-Powered Revenue Optimization Suite
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Stripe quietly released a suite of ML tools that automatically optimize checkout flows, reduce churn, and predict payment failures before they happen.
        </p>
      </div>
    </article>
  );
}
