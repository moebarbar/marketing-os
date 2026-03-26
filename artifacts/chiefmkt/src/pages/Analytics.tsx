import { useGetAnalyticsOverview, useGetTopPages, useGetTrafficSources } from "@workspace/api-client-react";
import { PageLoader, ErrorState } from "@/components/ui/loading-states";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const PROJECT_ID = 1;
const COLORS = ['hsl(var(--primary))', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export default function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useGetAnalyticsOverview({ projectId: PROJECT_ID, period: '30d' });
  const { data: topPages, isLoading: pagesLoading } = useGetTopPages({ projectId: PROJECT_ID, limit: 5 });
  const { data: sources, isLoading: sourcesLoading } = useGetTrafficSources({ projectId: PROJECT_ID });

  if (overviewLoading || pagesLoading || sourcesLoading) return <PageLoader />;
  if (!overview || !topPages || !sources) return <ErrorState />;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Deep dive into your website performance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Sessions", value: overview.sessions.toLocaleString() },
          { label: "Unique Visitors", value: overview.visitors.toLocaleString() },
          { label: "Page Views", value: overview.pageViews.toLocaleString() },
          { label: "Bounce Rate", value: `${(overview.bounceRate * 100).toFixed(1)}%` },
          { label: "Avg Duration", value: `${Math.floor(overview.avgSessionDuration / 60)}m ${overview.avgSessionDuration % 60}s` },
          { label: "New vs Returning", value: `${Math.round((overview.newVisitors / overview.visitors) * 100)}% / ${Math.round((overview.returningVisitors / overview.visitors) * 100)}%` },
        ].map(stat => (
          <div key={stat.label} className="glass-panel p-4 rounded-xl text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-xl font-display font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-display font-bold text-white mb-6">Traffic Sources</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sources}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="visitors"
                  nameKey="source"
                  stroke="none"
                >
                  {sources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'white' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl overflow-hidden flex flex-col">
          <h3 className="text-lg font-display font-bold text-white mb-6">Top Pages</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Page Path</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Bounce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {topPages.map((page) => (
                  <tr key={page.path} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 font-medium text-slate-200">
                      {page.path}
                      <div className="text-xs text-slate-500 font-normal truncate max-w-[200px]">{page.title}</div>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-300">{page.views.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-slate-300">{(page.bounceRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
