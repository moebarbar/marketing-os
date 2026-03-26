import { useState } from "react";
import { useListFunnels, useGetFunnelData, useCreateFunnel } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Filter, Plus, ArrowRight, MousePointerClick, Users, TrendingDown } from "lucide-react";
import { formatNumber, formatPercentage } from "@/lib/utils";

const PROJECT_ID = 1;

export default function Funnels() {
  const [activeFunnelId, setActiveFunnelId] = useState<number | null>(null);
  const { data: funnels, isLoading: funnelsLoading } = useListFunnels({ projectId: PROJECT_ID });
  
  // Use enabled to only fetch when a funnel is selected, fallback to first if available
  const currentId = activeFunnelId || (funnels?.[0]?.id) || 0;
  const { data: funnelData, isLoading: dataLoading } = useGetFunnelData(currentId, { query: { enabled: !!currentId } });

  if (funnelsLoading) return <PageLoader />;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Filter className="w-8 h-8 text-primary" />
            Conversion Funnels
          </h1>
          <p className="text-slate-400 mt-1">Track where users drop off in your key user journeys.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Funnel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-slate-300 px-1 uppercase text-xs tracking-wider">Active Funnels</h3>
          <div className="space-y-2">
            {funnels?.map(f => (
              <button 
                key={f.id}
                onClick={() => setActiveFunnelId(f.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  currentId === f.id 
                    ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className={`font-semibold ${currentId === f.id ? 'text-primary' : 'text-slate-200'}`}>{f.name}</div>
                <div className="text-xs text-slate-500 mt-1">{f.steps.length} steps</div>
              </button>
            ))}
          </div>
        </div>

        {/* Visualizer */}
        <div className="lg:col-span-3">
          {dataLoading ? (
            <div className="h-[400px] glass-panel rounded-2xl border-slate-800 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : funnelData ? (
            <div className="glass-panel p-8 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-end mb-12 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-2xl font-display font-bold text-white">{funnels?.find(f => f.id === currentId)?.name}</h2>
                  <p className="text-slate-400 mt-1 text-sm">Last 30 days of data</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 uppercase tracking-wider mb-1">Overall Conversion</div>
                  <div className="text-3xl font-display font-bold text-emerald-400">{formatPercentage(funnelData.overallConversionRate)}</div>
                </div>
              </div>

              <div className="space-y-4 relative">
                {/* Connecting line behind */}
                <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-slate-800 z-0"></div>

                {funnelData.steps.map((step, i) => {
                  // Calculate width based on visitors relative to step 1
                  const maxVisitors = funnelData.steps[0].visitors;
                  const widthPercent = Math.max(15, (step.visitors / maxVisitors) * 100);
                  
                  return (
                    <div key={step.stepId} className="relative z-10">
                      <div className="flex items-center gap-6">
                        {/* Step Number Badge */}
                        <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center font-display font-bold text-xl text-slate-300 shadow-xl flex-shrink-0 relative">
                          {i + 1}
                          {i > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-0.5 bg-slate-800"></div>}
                        </div>
                        
                        {/* Bar and Stats */}
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="flex justify-between items-end mb-2">
                            <h4 className="font-medium text-slate-200">{step.name}</h4>
                            <span className="font-bold text-white">{formatNumber(step.visitors)} <span className="text-xs text-slate-500 font-normal">users</span></span>
                          </div>
                          
                          <div className="w-full h-12 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-800/50 flex">
                            <div 
                              className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-out relative"
                              style={{ width: `${widthPercent}%` }}
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-30"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dropoff Indicator (if not last step) */}
                      {i < funnelData.steps.length - 1 && (
                        <div className="ml-20 my-4 flex items-center gap-4 text-sm">
                          <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 ml-6" />
                          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1.5 font-medium">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {formatPercentage(step.dropoffRate)} Drop-off
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
             <div className="h-[400px] glass-panel rounded-2xl border-slate-800 flex items-center justify-center text-slate-500">
               Select a funnel to view data
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
