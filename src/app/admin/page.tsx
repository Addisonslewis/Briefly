"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface ServiceCheck {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
}

interface StatusResponse {
  checkedAt: string;
  services: ServiceCheck[];
}

interface DigestFlag {
  id: string;
  issue: string;
  createdAt: string;
  user: { name: string | null; email: string | null };
  digest: { sentAt: string };
}

const statusColors = {
  ok: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", dot: "bg-amber-500" },
  error: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", dot: "bg-red-500" },
};

export default function AdminPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [digestStatus, setDigestStatus] = useState<{ message: string; type: "ok" | "error" } | null>(null);
  const [sendingSelf, setSendingSelf] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [confirmMass, setConfirmMass] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [flags, setFlags] = useState<DigestFlag[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/service-status");
      if (res.status === 403) {
        setError("You don't have admin access.");
        return;
      }
      if (!res.ok) {
        setError("Failed to fetch service status.");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/flags");
      if (res.ok) {
        const json = await res.json();
        setFlags(json.flags);
      }
    } catch {
      // silently fail — flags are non-critical
    } finally {
      setFlagsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchStatus();
      fetchFlags();
    }
  }, [authStatus, fetchStatus, fetchFlags]);

  if (authStatus === "loading" || (authStatus === "authenticated" && loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-100 via-blue-100 to-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Admin Dashboard</h1>
          <div className="rounded-xl bg-red-50 p-6 ring-1 ring-red-200">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const overallStatus = data?.services.some((s) => s.status === "error")
    ? "error"
    : data?.services.some((s) => s.status === "warning")
      ? "warning"
      : "ok";

  const overallLabel = {
    ok: "All systems operational",
    warning: "Some services need attention",
    error: "One or more services are down",
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Service health &amp; account status
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-primary hover:text-white transition-colors"
          >
            Back
          </button>
        </div>

        {/* Overall status */}
        <div className={`rounded-xl p-5 ring-1 ${statusColors[overallStatus].bg} ${statusColors[overallStatus].ring}`}>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${statusColors[overallStatus].dot}`} />
            <p className={`font-semibold ${statusColors[overallStatus].text}`}>
              {overallLabel[overallStatus]}
            </p>
          </div>
          {data?.checkedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Last checked: {new Date(data.checkedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          {data?.services.map((service) => {
            const colors = statusColors[service.status];
            return (
              <div
                key={service.name}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                      <h3 className="text-sm font-semibold text-foreground">{service.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 ml-5">
                      {service.message}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
                    {service.status === "ok" ? "Healthy" : service.status === "warning" ? "Warning" : "Down"}
                  </span>
                </div>

                {/* Extra details for services that have them */}
                {service.details && (
                  <div className="mt-3 ml-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(service.details).map(([key, val]) => (
                      <div key={key} className="rounded-lg bg-secondary/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                        <p className="text-sm font-medium text-foreground">
                          {typeof val === "number" && key.includes("ount") ? val.toLocaleString() : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Digest Actions */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Digest Actions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manually trigger digest generation and delivery.
            </p>
          </div>

          {digestStatus && (
            <div className={`rounded-lg p-3 text-sm ${digestStatus.type === "ok" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>
              {digestStatus.message}
            </div>
          )}

          {/* Send to self */}
          <button
            onClick={async () => {
              setSendingSelf(true);
              setDigestStatus(null);
              try {
                const res = await fetch("/api/admin/trigger-digest", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "self" }),
                });
                const data = await res.json();
                if (data.results?.[0]?.status === "success") {
                  setDigestStatus({ message: "Digest sent to your inbox!", type: "ok" });
                } else if (data.results?.[0]?.error) {
                  setDigestStatus({ message: `Failed: ${data.results[0].error}`, type: "error" });
                } else {
                  setDigestStatus({ message: data.message || "Digest triggered.", type: "ok" });
                }
              } catch {
                setDigestStatus({ message: "Network error triggering digest.", type: "error" });
              } finally {
                setSendingSelf(false);
              }
            }}
            disabled={sendingSelf}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {sendingSelf ? "Generating digest..." : "Send digest to me"}
          </button>

          {/* Mass send */}
          <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">Mass send to all users</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This will trigger the digest pipeline for every user who hasn&apos;t received one today. Uses Anthropic API credits, Resend sends, and SocialData calls for each user.
                </p>
              </div>
            </div>

            {!confirmMass ? (
              <button
                onClick={() => setConfirmMass(true)}
                className="w-full rounded-lg bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-300 transition-colors hover:bg-amber-200"
              >
                Send to all users...
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-800">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setSendingAll(true);
                      setDigestStatus(null);
                      try {
                        const res = await fetch("/api/admin/trigger-digest", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mode: "all" }),
                        });
                        const data = await res.json();
                        setDigestStatus({ message: data.message || "Mass digest triggered.", type: "ok" });
                      } catch {
                        setDigestStatus({ message: "Network error triggering mass digest.", type: "error" });
                      } finally {
                        setSendingAll(false);
                        setConfirmMass(false);
                      }
                    }}
                    disabled={sendingAll}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {sendingAll ? "Triggering..." : "Yes, send to everyone"}
                  </button>
                  <button
                    onClick={() => setConfirmMass(false)}
                    className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-300 transition-colors hover:bg-amber-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flagged Issues */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Flagged Issues</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                User-reported inaccuracies in digest emails.
              </p>
            </div>
            {flags.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                {flags.length}
              </span>
            )}
          </div>

          {flagsLoaded && flags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No flags yet. Users can report issues from their digest emails.
            </p>
          )}

          {flags.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {flags.map((flag) => (
                <div key={flag.id} className="rounded-lg bg-secondary/30 p-3.5 ring-1 ring-border/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground">
                      {flag.user.name || flag.user.email || "Unknown user"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(flag.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{flag.issue}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Digest from {new Date(flag.digest.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh button */}
        <div className="text-center">
          <button
            onClick={() => { fetchStatus(); fetchFlags(); }}
            disabled={loading}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Checking..." : "Refresh Status"}
          </button>
        </div>
      </div>
    </main>
  );
}
