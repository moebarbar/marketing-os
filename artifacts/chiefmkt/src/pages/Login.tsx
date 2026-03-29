import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = mode === "login"
      ? await login(email, password)
      : await register(email, password, name);
    setLoading(false);
    if (err) { setError(err); return; }
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
            <Zap className="w-7 h-7 text-primary fill-primary/20" />
            ChiefMKT
          </div>
          <p className="text-sm text-muted-foreground">Your AI Marketing OS</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-8 shadow-2xl shadow-black/20">
          {/* Mode toggle */}
          <div className="flex rounded-xl border border-card-border p-1 mb-6 bg-background">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); }} className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-all", mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" type="text" className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors" />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" required className="w-full bg-background border border-card-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors" />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type={showPassword ? "text" : "password"} required minLength={6} className="w-full bg-background border border-card-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="text-primary hover:underline font-medium">
              {mode === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
