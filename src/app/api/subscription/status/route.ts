import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUserActive, getSubscriptionStatusLabel } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      planType: true,
      stripeSubscriptionStatus: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      trialEndsAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    hasSubscription:
      user.planType === "paid" && !!user.stripeSubscriptionStatus,
    status: user.stripeSubscriptionStatus,
    planType: user.planType,
    isActive: isUserActive(user),
    statusLabel: getSubscriptionStatusLabel(user),
    currentPeriodEnd: user.stripeCurrentPeriodEnd,
  });
}
