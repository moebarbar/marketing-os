import { useListSocialPosts } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/loading-states";
import { Share2, Plus, Twitter, Linkedin, Facebook, Instagram, Heart, Repeat2, Calendar } from "lucide-react";

const PROJECT_ID = 1;

export default function SocialMedia() {
  const { data: posts, isLoading } = useListSocialPosts({ projectId: PROJECT_ID });

  if (isLoading) return <PageLoader />;

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Share2 className="w-8 h-8 text-primary" />
            Social Media
          </h1>
          <p className="text-slate-400 mt-1">Schedule and manage your multi-channel posts.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="space-y-4">
        {posts?.map(post => (
          <div key={post.id} className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex -space-x-2">
                  {post.platforms.map((p, i) => (
                    <div key={p} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-card flex items-center justify-center text-slate-300 z-[var(--i)]" style={{ zIndex: 10 - i }}>
                      {getPlatformIcon(p)}
                    </div>
                  ))}
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  post.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {post.status}
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{post.content}</p>
            </div>

            <div className="md:w-48 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Draft'}
                </div>
              </div>
              
              {post.status === 'published' && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-rose-400 text-sm font-medium">
                    <Heart className="w-4 h-4 fill-current" /> {post.likes}
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                    <Repeat2 className="w-4 h-4" /> {post.shares}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
