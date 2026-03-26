import { useState } from "react";
import { Check, Zap, Star, Building2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const PROJECT_ID = 1;

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: 49,
    description: "Perfect for growing businesses",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    highlight: false,
    features: [
      "1 website",
      "All core marketing tools",
      "SEO Analyzer & Keywords",
      "Lead Management",
      "Email Campaigns",
      "AI Content Generator",
      "A/B Testing",
      "Analytics Dashboard",
      "Chat Widget",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 99,
    description: "For scaling marketing teams",
    icon: Star,
    color: "from-violet-500 to-purple-600",
    highlight: true,
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
  {
    key: "agency",
    name: "Agency",
    price: 249,
    description: "White-label for agencies",
    icon: Building2,
    color: "from-amber-500 to-orange-500",
    highlight: false,
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
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSelectPlan = async (planKey: string) => {
    setLoading(planKey);
    try {
      const origin = window.location.origin;
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          plan: planKey,
          successUrl: `${origin}${base}/billing?success=true`,
          cancelUrl: `${origin}${base}/pricing`,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not start checkout";
      toast({ title: "Checkout failed", description: message, variant: "destructive" });
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
          <Zap className="w-4 h-4" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">
          Choose your plan
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Start growing your marketing with powerful AI tools. Upgrade or cancel anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border flex flex-col ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
                  : "border-card-border bg-card/40"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-6 border-b border-card-border/50">
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${plan.color} mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">{plan.name}</h2>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <div className="p-6 flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={loading === plan.key}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    plan.highlight
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-foreground border border-slate-700"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loading === plan.key ? (
                    "Redirecting..."
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-muted-foreground text-sm mt-8">
        All plans include a 14-day free trial. No credit card required to start.
      </p>
    </div>
  );
}
