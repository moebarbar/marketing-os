import { useState, useEffect } from "react";
import { FolderOpen, Plus, Globe, Mail, Trash2, RefreshCw, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface StudioProject {
  id: number;
  name: string;
  projectType: string;
  isPublished: boolean;
  publishedUrl?: string | null;
  updatedAt: string;
}

interface Props {
  selectedId: number | null;
  onSelect: (p: StudioProject) => void;
  onNew: (type: "web" | "email") => void;
}

export default function ProjectPanel({ selectedId, onSelect, onNew }: Props) {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/studio/projects?projectId=1`);
      const data = await r.json();
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`${BASE}/api/studio/projects/${id}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-[#c9d1d9]">Projects</span>
        </div>
        <button onClick={load} className="p-1 text-[#8b949e] hover:text-white transition-colors" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* New project buttons */}
      <div className="p-4 space-y-2 border-b border-[#21262d]">
        <button
          onClick={() => onNew("web")}
          className="w-full flex items-center gap-3 p-3 bg-blue-600/10 border border-blue-600/20 hover:border-blue-500/50 rounded-xl text-sm text-blue-300 hover:bg-blue-600/20 transition-colors"
        >
          <Globe className="w-4 h-4" />
          New Website / Landing Page
        </button>
        <button
          onClick={() => onNew("email")}
          className="w-full flex items-center gap-3 p-3 bg-violet-600/10 border border-violet-600/20 hover:border-violet-500/50 rounded-xl text-sm text-violet-300 hover:bg-violet-600/20 transition-colors"
        >
          <Mail className="w-4 h-4" />
          New Email Template
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && projects.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-[#8b949e]" />
          </div>
        )}
        {!loading && projects.length === 0 && (
          <div className="text-center py-12 text-[#8b949e]">
            <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No projects yet.</p>
            <p className="text-xs mt-1">Create one above to get started.</p>
          </div>
        )}
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all mb-1 group ${
              selectedId === p.id
                ? "bg-[#21262d] border border-violet-500/30"
                : "hover:bg-[#21262d] border border-transparent"
            }`}
          >
            {p.projectType === "web" ? (
              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
            ) : (
              <Mail className="w-4 h-4 text-violet-400 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#c9d1d9] truncate font-medium">{p.name}</p>
              <p className="text-xs text-[#8b949e] mt-0.5 flex items-center gap-1.5">
                {new Date(p.updatedAt).toLocaleDateString()}
                {p.isPublished && (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Live
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {p.publishedUrl && (
                <a
                  href={p.publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1 text-[#8b949e] hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={e => handleDelete(p.id, e)}
                disabled={deleting === p.id}
                className="p-1 text-[#8b949e] hover:text-red-400 transition-colors"
              >
                <Trash2 className={`w-3.5 h-3.5 ${deleting === p.id ? "animate-pulse" : ""}`} />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
