import { FolderOpen, Sparkles, Rocket, Search, BarChart3, Palette, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioPanel = "projects" | "ai" | "deploy" | "seo" | "analytics" | "templates";

const ITEMS: { id: StudioPanel; icon: React.ElementType; label: string; color: string }[] = [
  { id: "projects", icon: FolderOpen, label: "Projects", color: "text-blue-400" },
  { id: "ai", icon: Sparkles, label: "AI Assistant", color: "text-purple-400" },
  { id: "templates", icon: Palette, label: "Templates", color: "text-pink-400" },
  { id: "deploy", icon: Rocket, label: "Deploy", color: "text-green-400" },
  { id: "seo", icon: Search, label: "SEO Tools", color: "text-amber-400" },
  { id: "analytics", icon: BarChart3, label: "Analytics", color: "text-cyan-400" },
];

interface Props {
  active: StudioPanel | null;
  onChange: (p: StudioPanel | null) => void;
}

export default function StudioSidebar({ active, onChange }: Props) {
  return (
    <div className="w-14 bg-[#0d1117] border-r border-[#21262d] flex flex-col items-center py-3 gap-1 flex-shrink-0">
      {/* Logo mark */}
      <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-blue-500 rounded-xl flex items-center justify-center mb-4 flex-shrink-0">
        <Layout className="w-4 h-4 text-white" />
      </div>

      {ITEMS.map(({ id, icon: Icon, label, color }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(isActive ? null : id)}
            title={label}
            className={cn(
              "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group",
              isActive ? "bg-[#21262d]" : "hover:bg-[#21262d]/60"
            )}
          >
            <Icon
              className={cn(
                "w-5 h-5 transition-colors",
                isActive ? color : "text-[#8b949e] group-hover:text-white"
              )}
            />
            {/* Active indicator */}
            {isActive && (
              <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r", color.replace("text-", "bg-"))} />
            )}
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2 py-1 bg-[#2d333b] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
