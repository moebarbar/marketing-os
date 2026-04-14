import { Sparkles, Rocket, Monitor, Tablet, Smartphone, ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

interface Props {
  projectName: string;
  saved: boolean;
  onSaveNow: () => void;
  onToggleAI: () => void;
  onDeploy: () => void;
}

export default function StudioTopBar({ projectName, saved, onSaveNow, onToggleAI, onDeploy }: Props) {
  const [activeDevice, setActiveDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  return (
    <div className="h-12 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between px-4 flex-shrink-0 gap-4">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/"
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors flex-shrink-0"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-sm font-semibold text-[#c9d1d9] truncate max-w-[180px]">{projectName || "New Project"}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {saved ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          ) : (
            <button
              onClick={onSaveNow}
              className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full hover:bg-amber-500/20 transition-colors"
            >
              <Save className="w-3 h-3" /> Save
            </button>
          )}
        </div>
      </div>

      {/* Center — device toggles */}
      <div className="flex items-center gap-1 bg-[#0d1117] rounded-lg p-1 flex-shrink-0">
        {(["desktop", "tablet", "mobile"] as const).map((d) => {
          const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
          return (
            <button
              key={d}
              onClick={() => setActiveDevice(d)}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
              className={`p-1.5 rounded transition-colors ${
                activeDevice === d ? "bg-[#21262d] text-white" : "text-[#8b949e] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggleAI}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 text-violet-300 rounded-lg text-sm hover:bg-violet-600/30 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:block">AI Generate</span>
        </button>
        <button
          onClick={onDeploy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors font-semibold"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Deploy</span>
        </button>
      </div>
    </div>
  );
}
