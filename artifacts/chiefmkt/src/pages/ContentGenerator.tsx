import { useState } from "react";
import { useGenerateContent, useGetContentHistory, ContentGenerateRequestType, ContentGenerateRequestTone } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Sparkles, Copy, Check, Clock, History, BookOpen, Box, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { pushContentToNotion, uploadToBox } from "@/lib/integrations-api";

const PROJECT_ID = 1;

export default function ContentGenerator() {
  const [type, setType] = useState<ContentGenerateRequestType>('blog_post');
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ContentGenerateRequestTone>('professional');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const [pushingNotion, setPushingNotion] = useState(false);
  const [uploadingBox, setUploadingBox] = useState(false);
  const [lastContentId, setLastContentId] = useState<number | null>(null);
  
  const { mutate: generate, isPending, data: result } = useGenerateContent();
  const { data: history, refetch: refetchHistory } = useGetContentHistory({ projectId: PROJECT_ID });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;
    generate(
      { data: { type, topic, tone, projectId: PROJECT_ID } },
      { onSuccess: (data) => { setLastContentId(data.id ?? null); setCopied(false); refetchHistory(); } }
    );
  };

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePushNotion = async (contentId?: number) => {
    const id = contentId ?? lastContentId;
    if (!id) {
      toast({ title: "No content", description: "Generate content first.", variant: "destructive" });
      return;
    }
    setPushingNotion(true);
    try {
      const res = await pushContentToNotion(id);
      if (res.success) {
        toast({ title: "Pushed to Notion", description: "Content page created in your Notion database." });
        if (res.pageUrl) window.open(res.pageUrl, '_blank');
      } else {
        toast({ title: "Push failed", description: res.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Push failed", description: "Could not connect to Notion.", variant: "destructive" });
    } finally {
      setPushingNotion(false);
    }
  };

  const handleUploadBox = async (contentId?: number) => {
    const id = contentId ?? lastContentId;
    if (!id) {
      toast({ title: "No content", description: "Generate content first.", variant: "destructive" });
      return;
    }
    setUploadingBox(true);
    try {
      const res = await uploadToBox({ contentId: id });
      if (res.success) {
        toast({ title: "Uploaded to Box", description: "Content uploaded to your Box account." });
        if (res.fileUrl) window.open(res.fileUrl, '_blank');
      } else {
        toast({ title: "Upload failed", description: res.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not connect to Box.", variant: "destructive" });
    } finally {
      setUploadingBox(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          AI Content Generator
        </h1>
        <p className="text-slate-400 mt-1">Create high-converting copy in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleGenerate} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Content Type</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as ContentGenerateRequestType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              >
                <option value="blog_post">Blog Post</option>
                <option value="ad_copy">Ad Copy</option>
                <option value="social_media">Social Media Post</option>
                <option value="email">Email Campaign</option>
                <option value="landing_page">Landing Page Copy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Topic / Prompt</label>
              <textarea 
                required
                rows={4}
                placeholder="What should this content be about?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tone of Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {['professional', 'casual', 'persuasive', 'humorous'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t as ContentGenerateRequestTone)}
                    className={`px-3 py-2 text-sm rounded-lg border capitalize transition-all ${
                      tone === t 
                        ? 'bg-primary/20 border-primary text-primary font-medium' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={isPending || !topic}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Generate Magic
                </>
              )}
            </button>
          </form>

          {history && history.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" /> Recent Generations
              </h3>
              <div className="space-y-3">
                {history.slice(0, 4).map(item => (
                  <div key={item.id} className="text-sm pb-3 border-b border-slate-800/50 last:border-0 last:pb-0 group">
                    <div className="text-slate-300 font-medium truncate cursor-pointer hover:text-primary transition-colors">{item.title}</div>
                    <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                      <span className="capitalize">{item.type.replace('_', ' ')}</span>
                      <span><Clock className="inline w-3 h-3 mr-1" />{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePushNotion(item.id)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3" /> Notion
                      </button>
                      <button
                        onClick={() => handleUploadBox(item.id)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Box className="w-3 h-3" /> Box
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {isPending ? (
             <div className="h-[600px] glass-panel rounded-2xl border border-slate-800 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                    <Sparkles className="w-8 h-8 text-primary relative z-10" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">AI is writing...</h3>
                  <p className="text-slate-400">Crafting the perfect {type.replace('_', ' ')}</p>
                </div>
             </div>
          ) : result ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full min-h-[600px] glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-white">{result.title}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">{result.wordCount} words • SEO Score: <span className="text-emerald-400 font-medium">{result.seoScore}/100</span></div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePushNotion()}
                    disabled={pushingNotion}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {pushingNotion ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                    Notion
                  </button>
                  <button 
                    onClick={() => handleUploadBox()}
                    disabled={uploadingBox}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {uploadingBox ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                    Box
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-slate-300 leading-relaxed font-sans text-[15px]">
                  {result.content}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[600px] glass-panel rounded-2xl border border-slate-800 flex items-center justify-center opacity-50 border-dashed">
              <div className="text-center text-slate-500">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Fill out the form on the left to generate content.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
