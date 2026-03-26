import { useState } from "react";
import { useAnalyzeSeo, useListSeoReports } from "@workspace/api-client-react";
import { PageLoader, ErrorState } from "@/components/ui/loading-states";
import { Search, AlertTriangle, AlertCircle, Info, RefreshCw, HardDrive, Box, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { saveSeoReportToDrive, uploadToBox } from "@/lib/integrations-api";

const PROJECT_ID = 1;

export default function SeoAnalyzer() {
  const [url, setUrl] = useState("");
  const { mutate: analyze, isPending, data: analysis, error: analyzeError } = useAnalyzeSeo();
  const { data: history, isLoading: historyLoading } = useListSeoReports({ projectId: PROJECT_ID });
  const { toast } = useToast();
  const [savingDrive, setSavingDrive] = useState(false);
  const [uploadingBox, setUploadingBox] = useState(false);
  const [lastReportId, setLastReportId] = useState<number | null>(null);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    analyze(
      { data: { url, projectId: PROJECT_ID } },
      {
        onSuccess: () => {
          if (history && history.length > 0) {
            setLastReportId(history[history.length - 1].id ?? null);
          }
        },
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-rose-400";
  };

  const handleSaveToDrive = async () => {
    if (!lastReportId && !(history && history.length > 0)) {
      toast({ title: "No report available", description: "Run an SEO analysis first.", variant: "destructive" });
      return;
    }
    const reportId = lastReportId ?? history![history!.length - 1].id;
    setSavingDrive(true);
    try {
      const result = await saveSeoReportToDrive(reportId);
      if (result.success) {
        toast({ title: "Saved to Google Drive", description: "SEO report saved successfully." });
        if (result.fileUrl) window.open(result.fileUrl, '_blank');
      } else {
        toast({ title: "Save failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Save failed", description: "Could not save to Drive.", variant: "destructive" });
    } finally {
      setSavingDrive(false);
    }
  };

  const handleUploadToBox = async () => {
    if (!lastReportId && !(history && history.length > 0)) {
      toast({ title: "No report available", description: "Run an SEO analysis first.", variant: "destructive" });
      return;
    }
    const reportId = lastReportId ?? history![history!.length - 1].id;
    setUploadingBox(true);
    try {
      const result = await uploadToBox({ reportId });
      if (result.success) {
        toast({ title: "Uploaded to Box", description: "SEO report uploaded successfully." });
        if (result.fileUrl) window.open(result.fileUrl, '_blank');
      } else {
        toast({ title: "Upload failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not upload to Box.", variant: "destructive" });
    } finally {
      setUploadingBox(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">SEO Analyzer</h1>
          <p className="text-slate-400 mt-1">Audit your pages for technical SEO issues and performance.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveToDrive}
            disabled={savingDrive || (!analysis && (!history || history.length === 0))}
            className="flex items-center gap-2 bg-amber-600/80 hover:bg-amber-500/80 disabled:opacity-40 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {savingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
            Save to Drive
          </button>
          <button
            onClick={handleUploadToBox}
            disabled={uploadingBox || (!analysis && (!history || history.length === 0))}
            className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500/80 disabled:opacity-40 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {uploadingBox ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
            Export to Box
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <form onSubmit={handleAnalyze} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="url"
              required
              placeholder="https://example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Analyze URL"}
          </button>
        </form>
      </div>

      <AnimatePresence mode="wait">
        {isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12">
            <PageLoader />
          </motion.div>
        )}

        {analyzeError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <ErrorState message="Failed to analyze URL. Please check the format and try again." />
          </motion.div>
        )}

        {analysis && !isPending && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="text-sm text-slate-400 font-medium mb-4 uppercase tracking-widest">Overall Score</div>
                <div className={`text-7xl font-display font-bold ${getScoreColor(analysis.score)} drop-shadow-lg`}>
                  {analysis.score}
                </div>
                <div className="mt-4 text-slate-300 text-sm">{analysis.url}</div>
              </div>

              <div className="md:col-span-2 glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-display font-bold text-white mb-4">Performance</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Mobile Speed</span>
                      <span className="font-bold text-white">{analysis.pageSpeed.mobile}/100</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${analysis.pageSpeed.mobile}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Desktop Speed</span>
                      <span className="font-bold text-white">{analysis.pageSpeed.desktop}/100</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${analysis.pageSpeed.desktop}%` }}></div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon active={!!analysis.metaTags.title} /> Title Tag
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon active={!!analysis.metaTags.description} /> Meta Desc
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircleIcon active={analysis.metaTags.hasOgTags} /> Open Graph
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-white">Discovered Issues ({analysis.issues.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToDrive}
                    disabled={savingDrive}
                    className="flex items-center gap-1.5 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {savingDrive ? <RefreshCw className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />}
                    Save to Drive
                  </button>
                  <button
                    onClick={handleUploadToBox}
                    disabled={uploadingBox}
                    className="flex items-center gap-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {uploadingBox ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Box className="w-3 h-3" />}
                    Export to Box
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {analysis.issues.map((issue, i) => (
                  <div key={i} className="p-6 hover:bg-slate-800/30 transition-colors flex gap-4 items-start">
                    <div className="mt-1">
                      {issue.severity === 'critical' ? <AlertTriangle className="w-5 h-5 text-rose-500" /> :
                       issue.severity === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-500" /> :
                       <Info className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                           issue.severity === 'critical' ? 'bg-rose-500/10 text-rose-400' :
                           issue.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                           'bg-blue-500/10 text-blue-400'
                        }`}>{issue.severity}</span>
                        <span className="font-semibold text-slate-200">{issue.type}</span>
                      </div>
                      <p className="text-slate-300 mb-2">{issue.message}</p>
                      <div className="text-sm bg-slate-900/80 text-primary border border-primary/20 p-3 rounded-lg flex items-start gap-2">
                        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span><strong>Fix:</strong> {issue.fix}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!analysis && !isPending && history && history.length > 0 && (
        <div className="pt-8">
          <h3 className="text-lg font-display font-bold text-white mb-4">Recent Audits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map(report => (
              <div key={report.id} className="p-4 glass-panel rounded-xl flex justify-between items-center group cursor-pointer hover:border-primary/50 transition-colors border border-slate-800" onClick={() => { setUrl(report.url); setLastReportId(report.id ?? null); analyze({ data: { url: report.url, projectId: PROJECT_ID }}); }}>
                <div className="truncate pr-4">
                  <div className="font-medium text-slate-200 truncate">{report.url}</div>
                  <div className="text-xs text-slate-500">{new Date(report.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`font-display font-bold text-xl ${getScoreColor(report.score)}`}>
                  {report.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon({ active }: { active: boolean }) {
  return active 
    ? <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">✓</div>
    : <div className="w-4 h-4 rounded-full border border-slate-600"></div>;
}
