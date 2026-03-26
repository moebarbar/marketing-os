import { useEffect, useState } from "react";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, ExternalLink, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

const PROJECT_ID = 1;
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Subscription {
  id: number;
  projectId: number;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

const PLAN_META: Record<string, { label: string; color: string; price: string }> = {
  starter: { label: "Starter", color: "text-blue-400", price: "$49/mo" },
  pro: { label: "Pro", color: "text-violet-400", price: "$99/mo" },
  agency: { label: "Agency", color: "text-amber-400", price: "$249/mo" },
};

export default function Billing() {
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const search = useSearch();

  useEffect(() => {
    fetch(`${BASE}/api/stripe/subscription?projectId=${PROJECT_ID}`)
      .then((r) => r.json())
      .then((data) => setSub(data))
      .catch(() => setSub(null));
  }, []);

  useEffect(() => {
    if (new URLSearchParams(search).get("success") === "true") {
      toast({ title: "Subscription activated!", description: "Welcome to ChiefMKT. Your plan is now active." });
    }
  }, [search, toast]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const origin = window.location.origin;
      const res = await fetch(`${BASE}/api/stripe/create-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          returnUrl: `${origin}${BASE}/billing`,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not open billing portal";
      toast({ title: "Error", description: message, variant: "destructive" });
      setPortalLoading(false);
    }
  };

  const renewalDate = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const planMeta = sub ? (PLAN_META[sub.plan] ?? { label: sub.plan, color: "text-foreground", price: "" }) : null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground text-sm">Manage your subscription and payment details.</p>
        </div>
      </div>

      {sub === undefined && (
        <div className="rounded-2xl border border-card-border bg-card/40 p-6 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
          <div className="h-8 bg-slate-700 rounded w-1/2" />
        </div>
      )}

      {sub === null && (
        <div className="rounded-2xl border border-card-border bg-card/40 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No active subscription</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Choose a plan to unlock all ChiefMKT features.
          </p>
          <a
            href={`${BASE}/pricing`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors"
          >
            View Pricing
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {sub && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-card-border bg-card/40 overflow-hidden">
            <div className="p-6 border-b border-card-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                    Current Plan
                  </p>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-2xl font-display font-bold ${planMeta?.color}`}>
                      {planMeta?.label}
                    </h2>
                    <span className="text-muted-foreground text-sm">{planMeta?.price}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  sub.status === "active" 
                    ? "bg-green-500/10 text-green-400" 
                    : sub.status === "past_due"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {sub.status === "active" ? "Active" : sub.status === "past_due" ? "Past Due" : "Canceled"}
                </div>
              </div>
            </div>

            {renewalDate && (
              <div className="px-6 py-4 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Next renewal</p>
                  <p className="text-sm text-foreground font-medium">{renewalDate}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleManageBilling}
              disabled={portalLoading || !sub.stripeCustomerId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4" />
              {portalLoading ? "Opening..." : "Manage Billing"}
            </button>
            <a
              href={`${BASE}/pricing`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-foreground border border-slate-700 font-semibold text-sm transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              Upgrade Plan
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
