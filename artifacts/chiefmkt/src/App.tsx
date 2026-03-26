import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import SeoAnalyzer from "@/pages/SeoAnalyzer";
import Keywords from "@/pages/Keywords";
import ContentGenerator from "@/pages/ContentGenerator";
import Funnels from "@/pages/Funnels";
import AbTesting from "@/pages/AbTesting";
import Leads from "@/pages/Leads";
import EmailCampaigns from "@/pages/EmailCampaigns";
import SocialMedia from "@/pages/SocialMedia";
import Competitors from "@/pages/Competitors";
import ChatWidget from "@/pages/ChatWidget";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/seo" component={SeoAnalyzer} />
        <Route path="/keywords" component={Keywords} />
        <Route path="/content" component={ContentGenerator} />
        <Route path="/funnels" component={Funnels} />
        <Route path="/ab-testing" component={AbTesting} />
        <Route path="/leads" component={Leads} />
        <Route path="/email" component={EmailCampaigns} />
        <Route path="/social" component={SocialMedia} />
        <Route path="/competitors" component={Competitors} />
        <Route path="/chat-widget" component={ChatWidget} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
