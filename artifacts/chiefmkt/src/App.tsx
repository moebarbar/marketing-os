import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Onboarding, useOnboarding } from "@/components/Onboarding";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import CmoChatPage from "@/pages/CmoChat";
import CmoAgentPage from "@/pages/CmoAgent";
import SeoAgentPage from "@/pages/SeoAgent";
import ContentAgentPage from "@/pages/ContentAgent";
import LeadsAgentPage from "@/pages/LeadsAgent";
import SeoAnalyzer from "@/pages/SeoAnalyzer";
import SeoMeta from "@/pages/SeoMeta";
import SeoSchema from "@/pages/SeoSchema";
import SeoPageSpeed from "@/pages/SeoPageSpeed";
import SeoBacklinks from "@/pages/SeoBacklinks";
import TrackingInstall from "@/pages/TrackingInstall";
import Keywords from "@/pages/Keywords";
import ContentGenerator from "@/pages/ContentGenerator";
import Funnels from "@/pages/Funnels";
import AbTesting from "@/pages/AbTesting";
import Leads from "@/pages/Leads";
import EmailCampaigns from "@/pages/EmailCampaigns";
import SocialMedia from "@/pages/SocialMedia";
import Competitors from "@/pages/Competitors";
import ChatWidget from "@/pages/ChatWidget";
import Integrations from "@/pages/Integrations";
import Pricing from "@/pages/Pricing";
import Billing from "@/pages/Billing";
import MemoryPage from "@/pages/Memory";
import ActivityPage from "@/pages/Activity";
import LoginPage from "@/pages/Login";
import HeatmapsPage from "@/pages/Heatmaps";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const { showOnboarding, completeOnboarding } = useOnboarding();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated (and not already on login page)
  if (!user && location !== "/login") {
    return <LoginPage />;
  }

  if (location === "/login") {
    return <LoginPage />;
  }

  // Show onboarding on first run
  if (showOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/chat" component={CmoChatPage} />
        <Route path="/agent/cmo" component={CmoAgentPage} />
        <Route path="/agent/seo" component={SeoAgentPage} />
        <Route path="/agent/content" component={ContentAgentPage} />
        <Route path="/agent/leads" component={LeadsAgentPage} />
        <Route path="/seo" component={SeoAnalyzer} />
        <Route path="/seo/meta" component={SeoMeta} />
        <Route path="/seo/schema" component={SeoSchema} />
        <Route path="/seo/pagespeed" component={SeoPageSpeed} />
        <Route path="/seo/backlinks" component={SeoBacklinks} />
        <Route path="/tracking/install" component={TrackingInstall} />
        <Route path="/keywords" component={Keywords} />
        <Route path="/content" component={ContentGenerator} />
        <Route path="/funnels" component={Funnels} />
        <Route path="/ab-testing" component={AbTesting} />
        <Route path="/leads" component={Leads} />
        <Route path="/email" component={EmailCampaigns} />
        <Route path="/social" component={SocialMedia} />
        <Route path="/competitors" component={Competitors} />
        <Route path="/chat-widget" component={ChatWidget} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/billing" component={Billing} />
        <Route path="/memory" component={MemoryPage} />
        <Route path="/activity" component={ActivityPage} />
        <Route path="/heatmaps" component={HeatmapsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
