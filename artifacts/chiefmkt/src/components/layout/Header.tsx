import { Bell, ChevronDown, Sparkles } from "lucide-react";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="h-16 border-b border-card-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
            A
          </div>
          <span className="text-sm font-medium text-slate-200">Acme Corp</span>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all font-medium text-sm">
          <Sparkles className="w-4 h-4" />
          Ask AI CMO
        </button>
        
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
        </button>

        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=1e293b`} alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}
