import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, BarChart3, LineChart, Search,
  PenTool, Filter, SplitSquareHorizontal, Users,
  Mail, Share2, Target, MessageSquare, Zap, Plug,
  CreditCard, Bot, FileText, TrendingUp, Brain, Activity, LogOut, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function LiveVisitorWidget() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${BASE}/api/analytics/realtime/count?projectId=1`);
        const d = await r.json();
        setCount(d.liveVisitors ?? 0);
      } catch { /* silent */ }
    };
    poll();
    const iv = setInterval(poll, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full blur-xl animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute" />
          <div className="w-3 h-3 bg-green-500 rounded-full relative" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live Visitors</div>
          <div className="text-2xl font-display font-bold text-slate-50">
            {count === null ? "—" : count.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

const AGENT_ITEMS = [
  { icon: Zap, label: "CMO Agent", href: "/agent/cmo" },
  { icon: Search, label: "SEO Agent", href: "/agent/seo" },
  { icon: FileText, label: "Content Agent", href: "/agent/content" },
  { icon: TrendingUp, label: "Leads Agent", href: "/agent/leads" },
];

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
  { icon: Flame, label: "Heatmaps", href: "/heatmaps" },
  { icon: Brain, label: "Agent Memory", href: "/memory" },
  { icon: Activity, label: "Activity Feed", href: "/activity" },
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
  const { user, logout } = useAuth();

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

      <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
        {/* CMO Chat — featured */}
        <div className="mb-3">
          <Link
            href="/chat"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group bg-gradient-to-r",
              location === "/chat"
                ? "from-primary/20 to-purple-500/10 text-primary border border-primary/20"
                : "from-primary/5 to-purple-500/5 text-foreground border border-primary/10 hover:from-primary/15 hover:to-purple-500/10 hover:border-primary/25"
            )}
          >
            <Bot className="w-5 h-5 text-primary" />
            Ask your CMO
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full">AI</span>
          </Link>
        </div>

        {/* AI Agents section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 mb-2">
            <Bot className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">AI Agents</span>
          </div>
          <div className="space-y-0.5">
            {AGENT_ITEMS.map((item) => {
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
        </div>

        <div className="h-px bg-card-border mx-3 mb-4" />

        {/* Main nav */}
        <div className="space-y-0.5">
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
      </div>

      <div className="p-4 border-t border-card-border space-y-3">
        {user && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-card/50 border border-card-border">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name ?? user.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <button onClick={logout} className="ml-2 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0" title="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {planMeta && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${planMeta.color}`}>
            <CreditCard className="w-3.5 h-3.5" />
            {planMeta.label}
          </div>
        )}
        <LiveVisitorWidget />
      </div>
    </aside>
  );
}
