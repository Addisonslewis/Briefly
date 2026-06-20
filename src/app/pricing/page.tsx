"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const isPaid = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED === "true";

interface SubStatus {
  hasSubscription: boolean;
  status?: string;
  planType?: string;
  isActive: boolean;
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-primary mt-0.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PricingContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState<SubStatus | null>(null);
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/subscription/status")
        .then((r) => r.json())
        .then(setSub)
        .catch(() => {});
    }
  }, [status]);

  async function handleSubscribe() {
    if (status !== "authenticated") {
      router.push("/");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-100 to-white">
      <div className="mx-auto max-w-4xl px-4 py-16 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay informed with AI-curated daily digests from your X feed.
            No ads, no noise, just the signal you care about.
          </p>
        </div>

        {canceled && (
          <div role="alert" className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 text-center">
            Checkout was canceled. You can try again whenever you&apos;re ready.
          </div>
        )}

        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center space-y-2">
              {isPaid ? (
                <>
                  <CardTitle className="text-3xl">Briefly Pro</CardTitle>
                  <div className="pt-2">
                    <span className="text-5xl font-bold text-primary">$8</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="text-base">
                    7-day free trial, then billed monthly. Cancel anytime.
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-3xl">Briefly</CardTitle>
                  <div className="pt-2">
                    <span className="text-5xl font-bold text-primary">Free</span>
                  </div>
                  <CardDescription className="text-base">
                    Free during beta. Sign in with X to get started.
                  </CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check />
                  <span>Daily AI-curated digest delivered every morning</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check />
                  <span>Powered by Claude AI for intelligent synthesis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check />
                  <span>Customizable signal profile for personalized content</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check />
                  <span>Zero data storage - your feed data is never saved</span>
                </li>
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              {status === "unauthenticated" && (
                <Button onClick={() => router.push("/")} className="w-full" size="lg">
                  {isPaid ? "Sign In to Subscribe" : "Sign In to Get Started"}
                </Button>
              )}

              {status === "authenticated" && (
                <>
                  {isPaid && sub ? (
                    <>
                      {sub.planType === "free" ? (
                        <div className="w-full text-center space-y-2">
                          <Badge variant="secondary" className="text-base px-4 py-2">
                            You have a free plan
                          </Badge>
                        </div>
                      ) : sub.hasSubscription ? (
                        <Button
                          onClick={handleManageBilling}
                          disabled={loading}
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          {loading ? "Loading..." : "Manage Billing"}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubscribe}
                          disabled={loading}
                          className="w-full"
                          size="lg"
                        >
                          {loading ? "Loading..." : "Subscribe Now"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="w-full text-center space-y-2">
                      <Badge variant="secondary" className="text-base px-4 py-2">
                        You&apos;re all set!
                      </Badge>
                    </div>
                  )}
                  <Button
                    onClick={() => router.push("/dashboard")}
                    variant="ghost"
                    className="w-full"
                  >
                    Back to Dashboard
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
