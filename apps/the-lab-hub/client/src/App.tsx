import { Switch, Route } from 'wouter';
import { Toaster } from 'sonner';
import LabEntrancePage from '@/app/page';
import VocalMatchmakerPage from '@/app/vocal-matchmaker/page';
import NotFound from '@/pages/NotFound';

function Router() {
  return (
    <Switch>
      <Route path="/vocal-matchmaker" component={VocalMatchmakerPage} />
      <Route path="/" component={LabEntrancePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-black text-zinc-100 antialiased"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <Router />
      <Toaster />
    </div>
  );
}

export default App;
