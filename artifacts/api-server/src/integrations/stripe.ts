import Stripe from "stripe";
import { getConnectorSettings } from "./client.js";

async function getStripeKey(): Promise<string> {
  const conn = await getConnectorSettings("stripe").catch(() => null);
  if (conn?.settings?.secret_key) return conn.settings.secret_key;
  if (conn?.settings?.STRIPE_SECRET_KEY) return conn.settings.STRIPE_SECRET_KEY;

  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) return envKey;

  throw new Error("Stripe is not connected. Please connect Stripe from the Integrations page.");
}

export async function getStripeClient(): Promise<Stripe> {
  const key = await getStripeKey();
  return new Stripe(key);
}

export const PLANS = {
  starter: {
    name: "Starter",
    price: 4900,
    interval: "month" as const,
    description: "Perfect for growing businesses",
    features: [
      "1 website",
      "All core marketing tools",
      "SEO Analyzer & Keywords",
      "Lead Management",
      "Email Campaigns (SendGrid)",
      "AI Content Generator",
      "A/B Testing",
      "Analytics Dashboard",
      "Chat Widget",
    ],
  },
  pro: {
    name: "Pro",
    price: 9900,
    interval: "month" as const,
    description: "For scaling marketing teams",
    features: [
      "5 websites",
      "Everything in Starter",
      "Priority AI generation",
      "HubSpot CRM sync",
      "Slack notifications",
      "Google Sheets exports",
      "Google Drive & Box",
      "Notion integration",
      "Advanced A/B testing",
      "Priority support",
    ],
  },
  agency: {
    name: "Agency",
    price: 24900,
    interval: "month" as const,
    description: "White-label for agencies",
    features: [
      "Unlimited websites",
      "Everything in Pro",
      "White-label branding",
      "Multi-user access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom reporting",
    ],
  },
};

export type PlanKey = keyof typeof PLANS;
