import React from 'react';
import { Switch, Route } from 'wouter';
import { Toaster } from '@/components/ui/sonner';
import NotFound from '@/pages/NotFound';
import Home from './pages/Home';
import Lab from './components/studio/Lab';
import {
  StudioHeaderProvider,
  useStudioHeaderRightSlot,
} from '@/contexts/StudioHeaderContext';

/**
 * Signal Flow Lab Pro - Main Application Entry
 * Orchestrates the full-screen studio environment and routing.
 */
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lab" component={Lab} />
      <Route component={NotFound} />
    </Switch>
  );
}

function StudioHeaderBar() {
  const headerRight = useStudioHeaderRightSlot();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[52px] border-b border-white/5 bg-black/55 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-4 px-4">
        <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3">
          <img
            src="/recordingstudio-logo.svg"
            alt="RecordingStudio.com"
            className="h-7 w-7 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-0.5 leading-none sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-serif text-lg tracking-tight text-white">
              <span className="italic">RecordingStudio</span>
              <span className="italic text-[#d4af37]">.com</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Signal Flow Lab Pro v3.0
            </span>
          </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center justify-end gap-2">
          {headerRight}
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <StudioHeaderProvider>
      <div className="min-h-screen overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#E8A020]/30">
        <StudioHeaderBar />
        <main className="h-screen w-screen pt-[52px]">
          <Router />
        </main>
        <Toaster />
      </div>
    </StudioHeaderProvider>
  );
}

export default App;
