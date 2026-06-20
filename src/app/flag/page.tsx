"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function FlagContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const digestId = searchParams.get("digestId");

  const [issue, setIssue] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  if (!digestId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Link</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This flag link is missing the digest reference. Please use the link from your email.
          </p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
        <div className="mx-auto max-w-lg text-center">
          <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-border/50">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
              <svg aria-hidden="true" className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Thanks for flagging this</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your feedback helps us improve Briefly&apos;s accuracy. We review every flag.
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
      <div className="mx-auto max-w-lg">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          &larr; Dashboard
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-6 sm:p-8 shadow-lg ring-1 ring-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200">
              <svg aria-hidden="true" className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Flag an Issue</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Spotted something inaccurate, misleading, or just off? Let us know so we can improve.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="issue" className="block text-sm font-medium text-foreground mb-1.5">
                What was wrong?
              </label>
              <textarea
                id="issue"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder='e.g., "The Top Story said Company X raised $500M but the actual amount was $200M" or "The summary misrepresented the original tweet"'
                maxLength={2000}
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {issue.length}/2000 characters
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <button
              onClick={async () => {
                if (!issue.trim()) return;
                setSending(true);
                setError(null);
                try {
                  const res = await fetch("/api/flag", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ digestId, issue: issue.trim() }),
                  });
                  if (res.ok) {
                    setSent(true);
                  } else {
                    const data = await res.json();
                    setError(data.error || "Something went wrong. Please try again.");
                  }
                } catch {
                  setError("Network error. Please try again.");
                } finally {
                  setSending(false);
                }
              }}
              disabled={sending || issue.trim().length === 0}
              className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {sending ? "Submitting..." : "Submit Flag"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function FlagPage() {
  return (
    <Suspense>
      <FlagContent />
    </Suspense>
  );
}
