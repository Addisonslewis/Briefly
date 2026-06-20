import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      const subscriptionId = session.subscription as string;
      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);

      await db.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(
            subscription.items.data[0].current_period_end * 1000
          ),
          planType: "paid",
        },
      });
      console.log(`[Stripe] Subscription activated for user ${userId}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await db.user.findUnique({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (!user) break;

      await db.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionStatus: subscription.status,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(
            subscription.items.data[0].current_period_end * 1000
          ),
        },
      });
      console.log(
        `[Stripe] Subscription updated for user ${user.id}: ${subscription.status}`
      );
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await db.user.findUnique({
        where: { stripeCustomerId: subscription.customer as string },
      });
      if (!user) break;

      await db.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionStatus: "canceled",
          stripeCurrentPeriodEnd: new Date(
            subscription.items.data[0].current_period_end * 1000
          ),
        },
      });
      console.log(`[Stripe] Subscription canceled for user ${user.id}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const user = await db.user.findUnique({
        where: { stripeCustomerId: invoice.customer as string },
      });
      if (!user) break;

      await db.user.update({
        where: { id: user.id },
        data: { stripeSubscriptionStatus: "past_due" },
      });
      console.log(`[Stripe] Payment failed for user ${user.id}`);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        (invoice.parent?.subscription_details?.subscription as string) || null;
      if (!subscriptionId) break;

      const user = await db.user.findUnique({
        where: { stripeCustomerId: invoice.customer as string },
      });
      if (!user) break;

      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      await db.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionStatus: subscription.status,
          stripeCurrentPeriodEnd: new Date(
            subscription.items.data[0].current_period_end * 1000
          ),
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
