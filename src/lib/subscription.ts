interface SubscriptionUser {
  planType: string;
  stripeSubscriptionStatus: string | null;
  trialEndsAt: Date | null;
}

export function isUserActive(user: SubscriptionUser): boolean {
  if (process.env.SUBSCRIPTIONS_ENABLED !== "true") return true;
  if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) return true;
  if (user.planType === "free") return true;
  if (user.planType === "paid") {
    return ["active", "trialing"].includes(user.stripeSubscriptionStatus || "");
  }
  return false;
}

export function getSubscriptionStatusLabel(user: SubscriptionUser): string {
  if (process.env.SUBSCRIPTIONS_ENABLED !== "true") return "Free (Beta)";
  if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) return "Trial";
  if (user.planType === "free") return "Free Plan";
  if (user.planType === "paid") {
    switch (user.stripeSubscriptionStatus) {
      case "active":
        return "Active";
      case "trialing":
        return "Trial";
      case "past_due":
        return "Past Due";
      case "canceled":
        return "Canceled";
      default:
        return "Inactive";
    }
  }
  return "No Subscription";
}
