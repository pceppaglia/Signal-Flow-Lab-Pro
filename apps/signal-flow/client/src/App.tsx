// apps/signal-flow/client/src/App.tsx
import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { Toaster } from 'sonner'; // Keep if used within signal-flow for notifications
import SignalFlowLabPage from '@/app/lab/signal-flow/page';
import NotFound from '@/pages/NotFound'; // Keep for signal-flow specific 404s
import { StudioHeaderProvider } from '@/contexts/StudioHeaderContext'; // Keep if generic to studio UI
import { cn } from '@/lib/utils'; // Keep if generic utility

// These redirects are for legacy paths and should remain if needed for signal-flow
function RedirectLabNestedSignalFlow() {
  return <Redirect to="/signal-flow" />;
}

function LegacyLabPathRedirect({
  params,
}: {
  params: { legacyId: string };
}) {
  return <Redirect to={`/signal-flow/${params.legacyId}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/signal-flow/:scenarioId" component={SignalFlowLabPage} />
      <Route path="/signal-flow" component={SignalFlowLabPage} />
      <Route path="/lab/signal-flow/:scenarioId" component={RedirectLabNestedSignalFlow} />
      <Route path="/lab/:legacyId" component={LegacyLabPathRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}

// StudioHeaderBar and AppChrome might need to be adjusted or moved if they are truly global
// For now, assuming they are part of the signal-flow app's shell
// If they contain auth-related logic, comment out or remove those parts.
function StudioHeaderBar() { /* ... existing implementation, remove auth-related parts ... */ }
function AppChrome() { /* ... existing implementation, remove auth-related parts ... */ }

function App() {
  return (
    <StudioHeaderProvider> {/* Keep if generic to studio UI */}
      <AppChrome /> {/* Keep if generic to studio UI */}
      <Toaster /> {/* Keep if used for notifications within signal-flow */}
      <Router />
    </StudioHeaderProvider>
  );
}

export default App;
