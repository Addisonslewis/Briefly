"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/admin";

interface Preferences {
  email: string;
  keywords: string[];
  ignoredTopics: string[];
  signalDescription: string;
}

interface SubStatus {
  hasSubscription: boolean;
  status?: string;
  planType?: string;
  isActive: boolean;
  statusLabel?: string;
  currentPeriodEnd?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status !== "authenticated") return;

    async function loadData() {
      const [prefsRes, subRes] = await Promise.all([
        fetch("/api/preferences"),
        fetch("/api/subscription/status"),
      ]);
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setPreferences(data);
        if (!data.signalDescription && data.keywords.length === 0) {
          router.push("/onboarding");
          return;
        }
      }
      if (subRes.ok) {
        setSub(await subRes.json());
      }
      setLoaded(true);
    }
    loadData();
  }, [status, router]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-100 via-blue-100 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Briefly</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin(session?.user?.email) && (
              <button
                onClick={() => router.push("/admin")}
                className="rounded-lg bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => router.push("/onboarding")}
              className="rounded-lg bg-secondary px-3.5 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-white"
            >
              Edit Preferences
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Connected Accounts */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
          <h2 className="text-sm font-semibold text-foreground">Connected Accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-4">
            Platforms feeding your daily digest.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <svg aria-hidden="true" className="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-foreground">X (Twitter)</span>
            </div>
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600 ring-1 ring-green-200">
              Connected
            </span>
          </div>
        </div>

        {/* Signal Profile */}
        {preferences && (
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Your Signal Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                What Briefly filters for in your feeds.
              </p>
            </div>
            {preferences.signalDescription && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Signal Description</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {preferences.signalDescription}
                </p>
              </div>
            )}
            {preferences.keywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tracking</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.keywords.map((kw) => (
                    <Badge key={kw} variant="secondary">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {preferences.ignoredTopics.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Filtering Out</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.ignoredTopics.map((topic) => (
                    <Badge key={topic} variant="destructive">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscription */}
        {sub && (
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Subscription</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-200">
                {sub.statusLabel || "Free (Beta)"}
              </span>
            </div>
            {sub.hasSubscription && sub.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mb-3">
                {sub.status === "canceled" ? "Access until" : "Renews"}{" "}
                {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="flex gap-2">
              {sub.hasSubscription ? (
                <button
                  onClick={async () => {
                    const res = await fetch("/api/stripe/portal", { method: "POST" });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}
                  className="rounded-lg bg-secondary px-3.5 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-white"
                >
                  Manage Billing
                </button>
              ) : sub.planType !== "free" ? (
                <button
                  onClick={() => router.push("/pricing")}
                  className="rounded-lg bg-secondary px-3.5 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-white"
                >
                  View Plans
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Digest Info */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50">
          <h2 className="text-sm font-semibold text-foreground">Daily Digest</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Your digest is generated and emailed every morning at 6:00 AM ET.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Briefly reads your X feed, categorizes every post,
            synthesizes the most important stories, and delivers a clean
            summary to your inbox. Raw feed data is never stored.
          </p>
        </div>

        {/* Feature Request */}
        <div className="text-center">
          <button
            onClick={() => { setFeedbackOpen(true); setFeedbackSent(false); }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Request a feature or share feedback &rarr;
          </button>
        </div>

        {/* Feedback Modal */}
        {feedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={(e) => { if (e.target === e.currentTarget) { setFeedbackOpen(false); setFeedbackMsg(""); } }} onKeyDown={(e) => { if (e.key === "Escape") { setFeedbackOpen(false); setFeedbackMsg(""); } }}>
            <div className="w-full max-w-md mx-4 rounded-xl bg-white p-6 shadow-lg">
              <h3 id="feedback-title" className="text-sm font-semibold text-foreground mb-1">Share Feedback</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Request a feature, report a bug, or tell us what you think.
              </p>
              {feedbackSent ? (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground font-medium mb-1">Thanks for the feedback!</p>
                  <p className="text-xs text-muted-foreground mb-4">We&rsquo;ll get back to you if needed.</p>
                  <button
                    onClick={() => { setFeedbackOpen(false); setFeedbackMsg(""); }}
                    className="rounded-lg bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-white"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    placeholder="What would make Briefly better for you?"
                    aria-label="Feedback message"
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => { setFeedbackOpen(false); setFeedbackMsg(""); }}
                      className="rounded-lg px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={feedbackSending || feedbackMsg.trim().length === 0}
                      onClick={async () => {
                        setFeedbackSending(true);
                        try {
                          await fetch("/api/feedback", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ message: feedbackMsg.trim() }),
                          });
                          setFeedbackSent(true);
                        } finally {
                          setFeedbackSending(false);
                        }
                      }}
                      className="rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {feedbackSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
