import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getStripeClient, PLANS, type PlanKey } from "../integrations/stripe.js";

const router: IRouter = Router();

router.get("/stripe/subscription", async (req, res) => {
  const projectId = parseInt(req.query.projectId as string);
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.projectId, projectId), eq(subscriptionsTable.status, "active")))
    .limit(1);
  res.json(sub ?? null);
});

router.post("/stripe/create-checkout", async (req, res) => {
  const { projectId, plan, successUrl, cancelUrl } = req.body as {
    projectId: number;
    plan: PlanKey;
    successUrl: string;
    cancelUrl: string;
  };

  if (!PLANS[plan]) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  const stripe = await getStripeClient();
  const planInfo = PLANS[plan];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: planInfo.price,
          recurring: { interval: planInfo.interval },
          product_data: {
            name: `ChiefMKT ${planInfo.name}`,
            description: planInfo.description,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { projectId: String(projectId), plan },
  });

  res.json({ url: session.url });
});

router.post("/stripe/create-portal", async (req, res) => {
  const { projectId, returnUrl } = req.body as {
    projectId: number;
    returnUrl: string;
  };

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.projectId, projectId))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    res.status(404).json({ error: "No active subscription found" });
    return;
  }

  const stripe = await getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  res.json({ url: session.url });
});

router.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  const stripe = await getStripeClient().catch(() => null);
  if (!stripe) {
    res.status(503).json({ error: "Stripe not connected" });
    return;
  }

  if (!webhookSecret) {
    res.status(503).json({ error: "Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET to enable webhooks." });
    return;
  }
  if (!sig) {
    res.status(400).json({ error: "Missing Stripe-Signature header" });
    return;
  }
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata: { projectId: string; plan: string };
      customer: string;
      subscription: string;
    };
    const projectId = parseInt(session.metadata.projectId);
    const plan = session.metadata.plan;

    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

    await db
      .insert(subscriptionsTable)
      .values({
        projectId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        plan,
        status: "active",
        currentPeriodEnd: new Date((stripeSubscription as { current_period_end: number }).current_period_end * 1000),
      })
      .onConflictDoUpdate({
        target: subscriptionsTable.projectId,
        set: {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          plan,
          status: "active",
          currentPeriodEnd: new Date((stripeSubscription as { current_period_end: number }).current_period_end * 1000),
        },
      });
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { id: string };
    await db
      .update(subscriptionsTable)
      .set({ status: "canceled" })
      .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id));
  } else if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as {
      id: string;
      status: string;
      current_period_end: number;
    };
    await db
      .update(subscriptionsTable)
      .set({
        status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      })
      .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id));
  }

  res.json({ received: true });
});

export default router;
