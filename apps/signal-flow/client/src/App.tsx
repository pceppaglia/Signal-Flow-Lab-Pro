import { Switch, Route, Redirect } from 'wouter';
import { Toaster } from 'sonner';
import SignalFlowLabPage from '@/app/lab/signal-flow/page';
import NotFound from '@/pages/NotFound';
import { StudioHeaderProvider } from '@/contexts/StudioHeaderContext';

/** Legacy URLs under `/lab/` redirect into `/signal-flow`. */
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

function StudioHeaderBar() {
  return null;
}

function AppChrome() {
  return null;
}

function App() {
  return (
    <StudioHeaderProvider>
      <StudioHeaderBar />
      <AppChrome />
      <Toaster />
      <Router />
    </StudioHeaderProvider>
  );
}

export default App;
