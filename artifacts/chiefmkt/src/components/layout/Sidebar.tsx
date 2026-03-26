import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, BarChart3, LineChart, Search, 
  PenTool, Filter, SplitSquareHorizontal, Users, 
  Mail, Share2, Target, MessageSquare, Zap, Plug,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Search, label: "SEO Analyzer", href: "/seo" },
  { icon: Target, label: "Keywords", href: "/keywords" },
  { icon: PenTool, label: "Content Gen", href: "/content" },
  { icon: Filter, label: "Funnels", href: "/funnels" },
  { icon: SplitSquareHorizontal, label: "A/B Testing", href: "/ab-testing" },
  { icon: Users, label: "Leads", href: "/leads" },
  { icon: Mail, label: "Email", href: "/email" },
  { icon: Share2, label: "Social", href: "/social" },
  { icon: LineChart, label: "Competitors", href: "/competitors" },
  { icon: MessageSquare, label: "Chat Widget", href: "/chat-widget" },
  { icon: Plug, label: "Integrations", href: "/integrations" },
  { icon: CreditCard, label: "Billing", href: "/billing" },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  starter: { label: "Starter Plan", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  pro: { label: "Pro Plan", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  agency: { label: "Agency Plan", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

export function Sidebar() {
  const [location] = useLocation();
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/stripe/subscription?projectId=1`)
      .then((r) => r.json())
      .then((data) => { if (data?.plan) setPlan(data.plan); })
      .catch(() => {});
  }, []);

  const planMeta = plan ? PLAN_LABELS[plan] : null;

  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 border-r border-card-border bg-card/40 backdrop-blur-xl hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-card-border">
        <div className="flex items-center gap-2 text-xl font-display font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          <Zap className="w-6 h-6 text-primary fill-primary/20" />
          ChiefMKT
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-slate-800/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-slate-500 group-hover:text-foreground"
              )} />
              {item.label}
              
              {isActive && (
                <div className="ml-auto w-1.5 h-4 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-card-border space-y-3">
        {planMeta && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${planMeta.color}`}>
            <CreditCard className="w-3.5 h-3.5" />
            {planMeta.label}
          </div>
        )}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute" />
              <div className="w-3 h-3 bg-green-500 rounded-full relative" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live Visitors</div>
              <div className="text-2xl font-display font-bold text-slate-50">1,432</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
