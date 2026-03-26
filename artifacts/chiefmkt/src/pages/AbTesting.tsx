import { useState } from "react";
import { useListAbTests } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { SplitSquareHorizontal, Plus, Trophy, Activity, CheckCircle2, PauseCircle, Bell, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notifySlack } from "@/lib/integrations-api";

const PROJECT_ID = 1;

export default function AbTesting() {
  const { data: tests, isLoading } = useListAbTests({ projectId: PROJECT_ID });
  const { toast } = useToast();
  const [notifyingId, setNotifyingId] = useState<number | null>(null);

  if (isLoading) return <PageLoader />;

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'running': return <Activity className="w-4 h-4 text-primary animate-pulse" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'paused': return <PauseCircle className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  const handleNotifySlack = async (test: { id: number; name: string; winner: string | null | undefined; confidence: number }) => {
    setNotifyingId(test.id);
    try {
      const result = await notifySlack({
        testName: test.name,
        winner: test.winner ?? 'variant',
        confidence: test.confidence,
      });
      if (result.success) {
        toast({ title: "Slack notified!", description: `Results for "${test.name}" posted to Slack.` });
      } else {
        toast({ title: "Notify failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Notify failed", description: "Could not reach Slack.", variant: "destructive" });
    } finally {
      setNotifyingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <SplitSquareHorizontal className="w-8 h-8 text-primary" />
            A/B Testing
          </h1>
          <p className="text-slate-400 mt-1">Optimize conversions by testing variations.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Test
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tests?.map((test) => (
          <div key={test.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800/50 bg-slate-900/30 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-white">{test.name}</h3>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  test.status === 'running' ? 'bg-primary/10 text-primary border border-primary/20' :
                  test.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {getStatusIcon(test.status)} {test.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-500">
                  Confidence: <strong className={test.confidence > 90 ? 'text-emerald-400' : 'text-amber-400'}>{test.confidence}%</strong>
                </div>
                {test.status === 'completed' && (
                  <button
                    onClick={() => handleNotifySlack({ id: test.id, name: test.name, winner: test.winner, confidence: test.confidence })}
                    disabled={notifyingId === test.id}
                    className="flex items-center gap-1.5 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {notifyingId === test.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                    Notify Slack
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="hidden md:flex absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-slate-800 items-center justify-center">
                <div className="bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">VS</div>
              </div>

              <div className={`p-4 rounded-xl border ${test.winner === 'control' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-600"></div>
                    Control (A)
                  </h4>
                  {test.winner === 'control' && <Trophy className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="text-xs text-slate-500 mb-4 truncate">{test.control.url}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Visitors</div>
                    <div className="text-xl font-bold text-white">{test.control.visitors.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Conv. Rate</div>
                    <div className="text-xl font-bold text-white">{(test.control.conversionRate * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${test.winner === 'variant' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary"></div>
                    Variant (B)
                  </h4>
                  {test.winner === 'variant' && <Trophy className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="text-xs text-slate-500 mb-4 truncate">{test.variant.url}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Visitors</div>
                    <div className="text-xl font-bold text-white">{test.variant.visitors.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500 tracking-wider mb-1">Conv. Rate</div>
                    <div className="text-xl font-bold text-white">{(test.variant.conversionRate * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
