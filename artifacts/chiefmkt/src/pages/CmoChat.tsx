import { useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { createCmoChat } from "@/lib/agents";
import { useAgentSession } from "@/hooks/useAgentSession";
import { Bot, Send, Square, Plus, TrendingUp, FileText, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTIONS = [
  {
    icon: Users,
    title: "Who to contact today",
    prompt: "Read my actual leads and tell me exactly who I should contact today. Rank them hot/warm/cold. For the top 3, write the exact message I should send.",
  },
  {
    icon: TrendingUp,
    title: "30-day growth plan",
    prompt: "Based on everything you know about my business, my current metrics, and my goals, give me a specific 30-day growth plan with daily actions.",
  },
  {
    icon: FileText,
    title: "Write a blog post",
    prompt: "Write a complete SEO-optimized blog post for my business. Use my brand voice and target my ideal customer. Pick the best topic based on what you know about my goals.",
  },
  {
    icon: Sparkles,
    title: "Beat my competitors",
    prompt: "Using what you know about my competitors, give me 5 specific counter-messaging angles I can use in ads, landing pages, and sales calls.",
  },
];

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/50"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function ToolCallBadge({ name }: { name: string }) {
  const label = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 w-fit">
      <div className="w-2.5 h-2.5 border border-primary/60 border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: any;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const toolCalls = message.parts?.filter((p: any) => p.type === "tool-invocation") ?? [];
  const showCursor = !isUser && isLast && isStreaming && message.content;
  const showThinking = !isUser && isLast && isStreaming && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3 px-2 py-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={cn("max-w-[78%] space-y-2", isUser && "flex flex-col items-end")}>
        {toolCalls.map((part: any, i: number) => (
          <ToolCallBadge key={i} name={part.toolInvocation?.toolName ?? "Thinking"} />
        ))}

        {(message.content || showThinking) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-slate-800/70 text-foreground rounded-bl-sm border border-slate-700/40"
            )}
          >
            {showThinking ? (
              <ThinkingDots />
            ) : (
              <>
                <span className="whitespace-pre-wrap">{message.content}</span>
                {showCursor && (
                  <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-slate-200">
          U
        </div>
      )}
    </motion.div>
  );
}

function ChatInterface({
  session,
  newSession,
}: {
  session: { sandboxId: string; threadId: string };
  newSession: () => void;
}) {
  const chat = useMemo(
    () => createCmoChat(session.sandboxId, session.threadId),
    [session.sandboxId, session.threadId]
  );

  const { messages, input, handleSubmit, status, stop, setInput } = useChat({
    chat: chat as any,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (input.trim() && !isStreaming) handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">CMO Agent</span>
            <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              online
            </span>
          </div>
        </div>
        <button
          onClick={newSession}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-accent"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isEmpty ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center h-full px-4 gap-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 flex items-center justify-center mx-auto shadow-lg shadow-primary/5">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your AI Chief Marketing Officer</h2>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                  I have access to your real leads, SEO reports, and business context. Ask me anything.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => handleSuggestion(s.prompt)}
                  className="text-left p-4 rounded-xl border border-border bg-card/40 hover:bg-card hover:border-primary/30 transition-all group space-y-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <s.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="text-xs font-medium text-foreground leading-snug">{s.title}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 max-w-3xl mx-auto w-full">
            <AnimatePresence initial={false}>
              {messages.map((message, i) => (
                <MessageBubble
                  key={message.id ?? i}
                  message={message}
                  isLast={i === messages.length - 1}
                  isStreaming={isStreaming}
                />
              ))}
            </AnimatePresence>

            {/* Thinking — before first assistant token arrives */}
            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 px-2 py-2"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-slate-800/70 rounded-2xl rounded-bl-sm border border-slate-700/40 px-4 py-3">
                  <ThinkingDots />
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-border flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-3 bg-slate-800/50 border border-slate-700/60 rounded-2xl px-4 py-3 focus-within:border-primary/40 focus-within:bg-slate-800/70 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask your CMO anything..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 resize-none outline-none min-h-[24px] max-h-[180px] disabled:opacity-50"
            />
            <button
              onClick={() => (isStreaming ? stop() : input.trim() && handleSubmit())}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                isStreaming
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                  : input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
              )}
            >
              {isStreaming ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
            ⌘ Enter to send · Click ■ to stop
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CmoChatPage() {
  const { session, loading, error: sessionError, newSession } =
    useAgentSession("chiefmkt-cmo", 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Connecting to your CMO...</p>
        </div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-sm">
          <Bot className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-destructive text-sm">{sessionError}</p>
          <p className="text-muted-foreground text-xs">
            Add <code className="text-primary">API_KEY_21ST</code> to your .env to activate the CMO agent.
          </p>
        </div>
      </div>
    );
  }

  return <ChatInterface session={session} newSession={newSession} />;
}
