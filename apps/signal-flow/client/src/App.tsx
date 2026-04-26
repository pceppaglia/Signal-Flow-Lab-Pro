import React from 'react';
import { Switch, Route, Redirect, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/sonner';
import NotFound from '@/pages/NotFound';
import LabEntrancePage from '@/app/page';
import SignalFlowLabPage from '@/app/lab/signal-flow/page';
import VocalMatchmakerPage from '@/app/vocal-matchmaker/page';
import { BrandLabLockup } from '@/components/BrandLabLockup';
import { cn } from '@/lib/utils';
import {
  StudioHeaderProvider,
  useStudioHeaderRightSlot,
} from '@/contexts/StudioHeaderContext';

function RedirectToSignalFlow({
  params,
}: {
  params: { scenarioId: string };
}) {
  return <Redirect to={`/signal-flow/${params.scenarioId}`} />;
}

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

function RedirectLabHubToRoot() {
  return <Redirect to="/" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/signal-flow/:scenarioId" component={SignalFlowLabPage} />
      <Route path="/signal-flow" component={SignalFlowLabPage} />
      <Route path="/vocal-matchmaker" component={VocalMatchmakerPage} />
      <Route path="/" component={LabEntrancePage} />
      <Route path="/lab/signal-flow/:scenarioId" component={RedirectToSignalFlow} />
      <Route path="/lab/signal-flow" component={RedirectLabNestedSignalFlow} />
      <Route path="/lab/:legacyId" component={LegacyLabPathRedirect} />
      <Route path="/lab" component={RedirectLabHubToRoot} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StudioHeaderBar() {
  const headerRight = useStudioHeaderRightSlot();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-white/5 bg-black/55 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-4 px-4 py-2">
        <BrandLabLockup className="pointer-events-auto min-w-0 flex-1" />
        <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-2">
          {headerRight}
        </div>
      </div>
    </header>
  );
}

function AppChrome() {
  const [loc] = useLocation();
  const path = (loc.split('?')[0] ?? '/').replace(/\/$/, '') || '/';
  const isHub = path === '/' || path === '';

  return (
    <div
      className={cn(
        'w-full bg-[#0a0a0a] text-white selection:bg-[#E8A020]/30',
        isHub
          ? 'min-h-screen'
          : 'flex h-screen min-h-0 flex-col overflow-hidden',
      )}
    >
      {!isHub && <StudioHeaderBar />}
      <main
        className={cn(
          'w-full',
          isHub ? '' : 'min-h-0 flex-1 overflow-hidden pt-20',
        )}
      >
        <Router />
      </main>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <StudioHeaderProvider>
      <AppChrome />
    </StudioHeaderProvider>
  );
}

export default App;
