import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
        <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
      </div>
      <p className="text-muted-foreground font-medium animate-pulse">Loading data...</p>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong loading this data." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center p-8 bg-destructive/5 rounded-2xl border border-destructive/20">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-display font-semibold text-foreground">Failed to Load</h3>
      <p className="text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}
