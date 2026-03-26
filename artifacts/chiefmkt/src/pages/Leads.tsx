import { useState } from "react";
import { useListLeads } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Users, Search, Download, Filter, RefreshCw, Sheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { syncLeadToHubSpot, exportToSheets } from "@/lib/integrations-api";

const PROJECT_ID = 1;

export default function Leads() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListLeads({ projectId: PROJECT_ID, page, limit: 10 });
  const { toast } = useToast();
  const [syncingLeadId, setSyncingLeadId] = useState<number | null>(null);
  const [exportingSheets, setExportingSheets] = useState(false);

  if (isLoading) return <PageLoader />;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'contacted': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'qualified': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'converted': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'lost': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const handleSyncHubSpot = async (leadId: number, leadName: string) => {
    setSyncingLeadId(leadId);
    try {
      const result = await syncLeadToHubSpot(leadId);
      if (result.success) {
        toast({ title: "Synced to HubSpot", description: `${leadName} has been synced as a HubSpot contact.` });
      } else {
        toast({ title: "Sync failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Sync failed", description: "Could not reach HubSpot. Check your connection.", variant: "destructive" });
    } finally {
      setSyncingLeadId(null);
    }
  };

  const handleExportSheets = async () => {
    setExportingSheets(true);
    try {
      const result = await exportToSheets('leads', PROJECT_ID);
      if (result.success) {
        toast({
          title: "Exported to Google Sheets",
          description: result.spreadsheetUrl
            ? `Spreadsheet ready. Opening...`
            : "Export successful.",
        });
        if (result.spreadsheetUrl) window.open(result.spreadsheetUrl, '_blank');
      } else {
        toast({ title: "Export failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Export failed", description: "Could not export data.", variant: "destructive" });
    } finally {
      setExportingSheets(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Lead Management
          </h1>
          <p className="text-slate-400 mt-1">Track and qualify your incoming leads.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button
            onClick={handleExportSheets}
            disabled={exportingSheets}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-900/30"
          >
            {exportingSheets ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />}
            Export to Sheets
          </button>
          <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/25">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div className="text-sm text-slate-400">
            Showing <strong className="text-white">{data?.leads.length}</strong> of <strong className="text-white">{data?.total}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Score</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data?.leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{lead.name || 'Unknown'}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{lead.company || '-'}</td>
                  <td className="px-6 py-4 text-slate-400 capitalize">{lead.source.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${lead.score > 70 ? 'bg-emerald-500' : lead.score > 40 ? 'bg-amber-500' : 'bg-slate-500'}`}
                          style={{ width: `${lead.score}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-slate-300">{lead.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSyncHubSpot(lead.id, lead.name || lead.email); }}
                      disabled={syncingLeadId === lead.id}
                      className="opacity-0 group-hover:opacity-100 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-lg transition-all disabled:opacity-30"
                    >
                      {syncingLeadId === lead.id ? "Syncing..." : "→ HubSpot"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex justify-between items-center text-sm">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-50 hover:bg-slate-800 transition-colors"
          >
            Previous
          </button>
          <span className="text-slate-500">Page {page} of {Math.ceil((data?.total || 0) / 10)}</span>
          <button 
            disabled={!data || data.leads.length < 10}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 disabled:opacity-50 hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
