import { useGetDashboardOverview, useGetDashboardVisitors, useGetAiRecommendations } from "@workspace/api-client-react";
import { PageLoader, ErrorState } from "@/components/ui/loading-states";
import { ArrowUpRight, ArrowDownRight, Users, Eye, MousePointerClick, Zap, CheckCircle2, Circle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion";

const PROJECT_ID = 1; // Defaulting as specified

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useGetDashboardOverview();
  const { data: visitors, isLoading: visitorsLoading } = useGetDashboardVisitors({ period: '30d' });
  const { data: recommendations, isLoading: recsLoading } = useGetAiRecommendations({ projectId: PROJECT_ID });

  if (overviewLoading || visitorsLoading || recsLoading) return <PageLoader />;
  if (overviewError || !overview) return <ErrorState message="Failed to load dashboard metrics" />;

  const metrics = [
    { label: "Total Visitors", value: (overview?.totalVisitors || 0).toLocaleString(), change: overview?.visitorsChange || 0, icon: Users },
    { label: "Page Views", value: (overview?.pageViews || 0).toLocaleString(), change: overview?.pageViewsChange || 0, icon: Eye },
    { label: "Leads", value: (overview?.leads || 0).toLocaleString(), change: overview?.leadsChange || 0, icon: Zap },
    { label: "Conversion Rate", value: `${((overview?.conversionRate || 0) * 100).toFixed(1)}%`, change: overview?.conversionRateChange || 0, icon: MousePointerClick },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your marketing today.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={metric.label} 
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 text-indigo-400">
                <metric.icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${metric.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metric.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <div>
              <div className="text-3xl font-display font-bold text-white mb-1">{metric.value}</div>
              <div className="text-sm text-slate-400 font-medium">{metric.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white">Visitor Traffic</h2>
            <select className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-primary">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            {visitors?.data && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitors.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'white' }}
                    itemStyle={{ color: 'hsl(var(--primary-foreground))' }}
                  />
                  <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-display font-bold text-white">AI Recommendations</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recommendations?.map((rec) => (
              <div key={rec.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/80 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                    rec.priority === 'high' ? 'bg-rose-500/10 text-rose-400' :
                    rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {rec.priority} Priority
                  </span>
                  {rec.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />}
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">{rec.title}</h4>
                <p className="text-xs text-slate-400 mb-3">{rec.description}</p>
                <div className="text-xs font-medium text-primary">Expected Impact: {rec.estimatedImpact}</div>
              </div>
            ))}
            {!recommendations?.length && (
              <div className="text-center text-slate-500 py-8">No current recommendations. You're doing great!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
