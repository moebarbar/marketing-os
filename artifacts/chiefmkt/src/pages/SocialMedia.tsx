import { useState, useEffect } from "react";
import { Share2, Plus, Twitter, Linkedin, Facebook, Instagram, Heart, Repeat2, Calendar, X, Send, Trash2, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

const PLATFORM_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  twitter: { icon: Twitter, color: "text-sky-400", label: "X (Twitter)" },
  linkedin: { icon: Linkedin, color: "text-blue-400", label: "LinkedIn" },
  facebook: { icon: Facebook, color: "text-indigo-400", label: "Facebook" },
  instagram: { icon: Instagram, color: "text-pink-400", label: "Instagram" },
};

interface Post {
  id: number; content: string; platforms: string[]; status: string;
  scheduledAt: string | null; likes: number; shares: number;
}

function NewPostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["twitter"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const save = async (publish = false) => {
    if (!content.trim() || platforms.length === 0) return;
    setSaving(true);
    await fetch(`${BASE}/api/social/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content, platforms, projectId: PROJECT_ID,
        scheduledAt: publish ? new Date().toISOString() : scheduledAt || null,
        status: publish ? "published" : scheduledAt ? "scheduled" : "draft",
      }),
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  const charLimit = platforms.includes("twitter") ? 280 : 3000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">New Post</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Platform selector */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PLATFORM_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const active = platforms.includes(key);
              return (
                <button key={key} onClick={() => togglePlatform(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${active ? "bg-slate-700 border-slate-500 text-white" : "bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-600"}`}>
                  <Icon className={`w-4 h-4 ${active ? meta.color : ""}`} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5}
            placeholder="What do you want to share?"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 resize-none" />
          <div className={`text-xs mt-1 text-right ${content.length > charLimit ? "text-rose-400" : "text-slate-500"}`}>
            {content.length} / {charLimit}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Schedule (optional)</label>
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-primary/50" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium">Cancel</button>
          <button onClick={() => save(false)} disabled={saving || !content.trim() || platforms.length === 0}
            className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            {scheduledAt ? <Calendar className="w-3.5 h-3.5" /> : null}
            {scheduledAt ? "Schedule" : "Save Draft"}
          </button>
          <button onClick={() => save(true)} disabled={saving || !content.trim() || platforms.length === 0}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SocialMedia() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/social/posts?projectId=${PROJECT_ID}`);
      setPosts(await r.json());
    } catch { /* silent */ }
    setLoading(false);
  };

  const publish = async (id: number) => {
    setPublishing(id);
    await fetch(`${BASE}/api/social/posts/${id}/publish`, { method: "PATCH" });
    setPublishing(null);
    load();
  };

  const remove = async (id: number) => {
    await fetch(`${BASE}/api/social/posts/${id}`, { method: "DELETE" });
    load();
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {showCreate && <NewPostModal onClose={() => setShowCreate(false)} onCreated={load} />}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Share2 className="w-8 h-8 text-primary" /> Social Media
          </h1>
          <p className="text-slate-400 mt-1">Schedule and manage your multi-channel posts.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
        {["all", "published", "scheduled", "draft"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-primary text-white" : "text-slate-400 hover:text-white"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 glass-panel rounded-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="h-48 glass-panel rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
          <Share2 className="w-10 h-10 text-slate-700" />
          <div className="text-slate-400 text-sm">{filter === "all" ? "No posts yet." : `No ${filter} posts.`}</div>
          {filter === "all" && (
            <button onClick={() => setShowCreate(true)} className="text-xs text-primary hover:underline">Create your first post →</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => (
            <div key={post.id} className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex -space-x-1.5">
                    {post.platforms.map((p, i) => {
                      const meta = PLATFORM_META[p];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <div key={p} className="w-7 h-7 rounded-full bg-slate-800 border-2 border-card flex items-center justify-center" style={{ zIndex: 10 - i }}>
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        </div>
                      );
                    })}
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    post.status === "published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    post.status === "scheduled" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    "bg-slate-800 text-slate-400 border-slate-700"}`}>
                    {post.status}
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{post.content}</p>
              </div>

              <div className="md:w-48 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "Draft"}
                </div>

                {post.status === "published" && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-rose-400 text-sm font-medium">
                      <Heart className="w-4 h-4 fill-current" /> {post.likes ?? 0}
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                      <Repeat2 className="w-4 h-4" /> {post.shares ?? 0}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {post.status !== "published" && (
                    <button onClick={() => publish(post.id)} disabled={publishing === post.id}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {publishing === post.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Publish
                    </button>
                  )}
                  <button onClick={() => remove(post.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
