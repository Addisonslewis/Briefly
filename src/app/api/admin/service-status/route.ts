import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { stripe } from "@/lib/stripe";

interface ServiceCheck {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: Record<string, unknown>;
}

async function checkStripe(): Promise<ServiceCheck> {
  try {
    const balance = await stripe.balance.retrieve();
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);
    return {
      name: "Stripe",
      status: "ok",
      message: `Balance: $${(available / 100).toFixed(2)} available, $${(pending / 100).toFixed(2)} pending`,
      details: { available: available / 100, pending: pending / 100, currency: "usd" },
    };
  } catch (e) {
    return {
      name: "Stripe",
      status: "error",
      message: e instanceof Error ? e.message : "Failed to connect",
    };
  }
}

async function checkAnthropic(): Promise<ServiceCheck> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    if (res.ok) {
      return { name: "Anthropic (Claude)", status: "ok", message: "API key valid, model responding" };
    }
    const data = await res.json();
    if (data.error?.type === "authentication_error") {
      return { name: "Anthropic (Claude)", status: "error", message: "Invalid API key" };
    }
    if (data.error?.type === "billing_error" || data.error?.type === "rate_limit_error") {
      return {
        name: "Anthropic (Claude)",
        status: "warning",
        message: data.error.message || "Billing or rate limit issue",
      };
    }
    return { name: "Anthropic (Claude)", status: "warning", message: data.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return {
      name: "Anthropic (Claude)",
      status: "error",
      message: e instanceof Error ? e.message : "Failed to connect",
    };
  }
}

async function checkResend(): Promise<ServiceCheck> {
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      const domainCount = data.data?.length ?? 0;
      return {
        name: "Resend (Email)",
        status: "ok",
        message: `API key valid, ${domainCount} domain${domainCount !== 1 ? "s" : ""} configured`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { name: "Resend (Email)", status: "error", message: "Invalid API key" };
    }
    return { name: "Resend (Email)", status: "warning", message: `HTTP ${res.status}` };
  } catch (e) {
    return {
      name: "Resend (Email)",
      status: "error",
      message: e instanceof Error ? e.message : "Failed to connect",
    };
  }
}

async function checkSocialData(): Promise<ServiceCheck> {
  if (!process.env.SOCIALDATA_API_KEY) {
    return { name: "SocialData", status: "warning", message: "No API key configured" };
  }
  try {
    // Lightweight call — fetch a known public user
    const res = await fetch("https://api.socialdata.tools/twitter/user/elonmusk", {
      headers: { Authorization: `Bearer ${process.env.SOCIALDATA_API_KEY}` },
    });
    if (res.ok) {
      return { name: "SocialData", status: "ok", message: "API key valid, balance sufficient" };
    }
    if (res.status === 402) {
      return { name: "SocialData", status: "error", message: "Insufficient balance — top up required" };
    }
    if (res.status === 401 || res.status === 403) {
      return { name: "SocialData", status: "error", message: "Invalid API key" };
    }
    return { name: "SocialData", status: "warning", message: `HTTP ${res.status}` };
  } catch (e) {
    return {
      name: "SocialData",
      status: "error",
      message: e instanceof Error ? e.message : "Failed to connect",
    };
  }
}

async function checkTwitter(): Promise<ServiceCheck> {
  // Check if we have any valid Twitter tokens by looking at the most recent account
  try {
    const account = await db.account.findFirst({
      where: { provider: "twitter" },
      orderBy: { id: "desc" },
      select: { access_token: true },
    });
    if (!account?.access_token) {
      return { name: "X / Twitter", status: "warning", message: "No connected accounts found" };
    }
    return { name: "X / Twitter", status: "ok", message: "OAuth tokens present in database" };
  } catch (e) {
    return {
      name: "X / Twitter",
      status: "error",
      message: e instanceof Error ? e.message : "Failed to query accounts",
    };
  }
}

async function checkDatabase(): Promise<ServiceCheck> {
  try {
    const userCount = await db.user.count();
    const digestCount = await db.digestHistory.count();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const digestsToday = await db.digestHistory.count({
      where: { sentAt: { gte: todayStart } },
    });
    return {
      name: "Database",
      status: "ok",
      message: `${userCount} users, ${digestCount} total digests, ${digestsToday} sent today`,
      details: { userCount, digestCount, digestsToday },
    };
  } catch (e) {
    return {
      name: "Database",
      status: "error",
      message: e instanceof Error ? e.message : "Failed to connect",
    };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const checks = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkAnthropic(),
    checkResend(),
    checkSocialData(),
    checkTwitter(),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services: checks,
  });
}
