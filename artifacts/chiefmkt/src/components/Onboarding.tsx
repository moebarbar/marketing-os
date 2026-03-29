import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const PROJECT_ID = 1;

const QUESTIONS = [
  { key: "business_name",       category: "BUSINESS_CORE", importance: 10, q: "What's your business name?",                                              placeholder: "e.g. Acme Marketing",               hint: "How should I refer to your business?" },
  { key: "product_description", category: "BUSINESS_CORE", importance: 10, q: "What do you sell? Describe your product or service.",                      placeholder: "e.g. We offer SaaS tools for...",    hint: "Be specific — I'll reference this in everything I write." },
  { key: "target_audience",     category: "AUDIENCE",      importance: 9,  q: "Who is your ideal customer?",                                              placeholder: "e.g. Marketing managers at B2B...",  hint: "Job title, company size, industry, pain points." },
  { key: "pricing",             category: "BUSINESS_CORE", importance: 8,  q: "What are your pricing tiers?",                                             placeholder: "e.g. Starter $49/mo, Pro $149/mo...",hint: "I'll reference this in ads, emails, and landing pages." },
  { key: "main_competitors",    category: "COMPETITORS",   importance: 8,  q: "Who are your top 3 competitors?",                                          placeholder: "e.g. HubSpot, Salesforce, ActiveCampaign", hint: "I'll help you differentiate from them." },
  { key: "unique_value_prop",   category: "BRAND_VOICE",   importance: 9,  q: "What makes you different from competitors?",                               placeholder: "e.g. We're 5x faster and half the price...", hint: "Your core USP — what makes you win deals." },
  { key: "brand_tone",          category: "BRAND_VOICE",   importance: 8,  q: "How would you describe your brand voice?",                                 placeholder: "e.g. Professional but approachable, no jargon...", hint: "I'll match this in all content I write." },
  { key: "primary_goal",        category: "GOALS",         importance: 9,  q: "What's your #1 marketing goal right now?",                                 placeholder: "e.g. Get to 100 paying customers by June...", hint: "I'll focus every recommendation on this." },
  { key: "current_channels",    category: "CAMPAIGNS",     importance: 7,  q: "What marketing channels are you currently using?",                         placeholder: "e.g. LinkedIn, Google Ads, email newsletter...", hint: "So I don't recommend things you're already doing." },
  { key: "website_url",         category: "BUSINESS_CORE", importance: 7,  q: "What's your website URL?",                                                 placeholder: "e.g. https://yoursite.com",          hint: "I'll use this for SEO analysis." },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState("");

  const current = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;
  const isLast = step === QUESTIONS.length - 1;

  const handleNext = async () => {
    if (!value.trim()) return;
    const newAnswers = { ...answers, [current.key]: value };
    setAnswers(newAnswers);
    setValue("");

    if (isLast) {
      setSaving(true);
      // Save all answers to agent memory
      await Promise.all(
        QUESTIONS.map((q) =>
          fetch(`${BASE}/api/agent/memory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: PROJECT_ID, key: q.key, value: newAnswers[q.key] ?? "", category: q.category, importance: q.importance }),
          })
        )
      );
      localStorage.setItem(`onboarding_complete_${PROJECT_ID}`, "1");
      setSaving(false);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNext();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      {/* Progress bar */}
      <div className="w-full max-w-xl mb-10">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary fill-primary/20" />
            <span className="font-bold text-primary">ChiefMKT</span>
          </div>
          <span>Question {step + 1} of {QUESTIONS.length}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">{current.category.replace("_", " ")}</span>
              <h2 className="text-2xl font-bold text-foreground mt-2 leading-snug">{current.q}</h2>
              <p className="text-sm text-muted-foreground mt-1.5">{current.hint}</p>
            </div>

            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={current.placeholder}
              rows={3}
              className="w-full bg-card border border-card-border rounded-2xl px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">⌘ Enter to continue</p>
              <button
                onClick={handleNext}
                disabled={!value.trim() || saving}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  value.trim() && !saving
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : isLast ? (
                  <><Check className="w-4 h-4" /> Finish setup</>
                ) : (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {/* Dots */}
            <div className="flex items-center gap-1.5 justify-center pt-2">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={cn("rounded-full transition-all", i === step ? "w-4 h-1.5 bg-primary" : i < step ? "w-1.5 h-1.5 bg-primary/40" : "w-1.5 h-1.5 bg-slate-700")} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(`onboarding_complete_${PROJECT_ID}`);
  });
  return { showOnboarding, completeOnboarding: () => setShowOnboarding(false) };
}
