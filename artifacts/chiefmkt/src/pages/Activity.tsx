import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Users, FileText, Search, Mail, Share2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

const TYPE_META: Record<string, { icon: typeof Users; color: string; bg: string }> = {
  lead:    { icon: Users,    color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  content: { icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  seo:     { icon: Search,   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  email:   { icon: Mail,     color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  social:  { icon: Share2,   color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
};

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  detail: string;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function groupByDate(items: ActivityItem[]) {
  const groups: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    const date = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) label = "Today";
    else if (date.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return groups;
}

export default function ActivityPage() {
  const [days, setDays] = useState(30);

  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["activity", PROJECT_ID, days],
    queryFn: () => fetch(`${BASE}/api/activity?projectId=${PROJECT_ID}&days=${days}`).then((r) => r.json()),
  });

  const counts = {
    lead: items.filter((i) => i.type === "lead").length,
    content: items.filter((i) => i.type === "content").length,
    seo: items.filter((i) => i.type === "seo").length,
    email: items.filter((i) => i.type === "email").length,
    social: items.filter((i) => i.type === "social").length,
  };

  const grouped = groupByDate(items);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Activity Feed</h1>
            <p className="text-sm text-muted-foreground">{items.length} events in the last {days} days</p>
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-card border border-card-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.entries(counts) as [string, number][]).map(([type, count]) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          return (
            <div key={type} className={cn("rounded-xl border p-3 flex items-center gap-3", meta.bg)}>
              <Icon className={cn("w-4 h-4 flex-shrink-0", meta.color)} />
              <div>
                <div className={cn("text-xl font-bold", meta.color)}>{count}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{type === "seo" ? "SEO" : type}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Activity className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No activity yet. Start using the platform to see events here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateItems]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{date}</span>
                <div className="flex-1 h-px bg-card-border" />
                <span className="text-xs text-muted-foreground">{dateItems.length} events</span>
              </div>
              <div className="space-y-2">
                {dateItems.map((item) => {
                  const meta = TYPE_META[item.type] ?? TYPE_META["content"];
                  const Icon = meta.icon;
                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 bg-card/40 border border-card-border rounded-xl p-3 hover:border-primary/20 transition-colors group">
                      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5", meta.bg)}>
                        <Icon className={cn("w-4 h-4", meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
