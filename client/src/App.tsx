import React from 'react';
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/NotFound";

// --- IMPORT OUR NEW STUDIO ENGINE ---
import Lab from './components/studio/Lab';

/**
 * Signal Flow Lab Pro - Main Application Entry
 * Orchestrates the full-screen studio environment and routing.
 */
function Router() {
  return (
    <Switch>
      {/* 
          The Lab is our main route. 
          Everything (Rack, Floor, Mixer) happens inside this component.
      */}
      <Route path="/" component={Lab} />
      
      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#E8A020]/30 overflow-hidden">
      {/* Global Studio Header */}
      <header className="fixed top-0 left-0 right-0 h-10 bg-black/40 backdrop-blur-md border-b border-white/5 z-50 flex items-center px-4 justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#E8A020] animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
            Signal Flow Lab <span className="text-white">Pro v2.0</span>
          </span>
        </div>
        <div className="text-[9px] font-mono text-gray-600">
          SYSTEM STATUS: ONLINE // 48-CHAN SOVEREIGN READY
        </div>
      </header>

      {/* Main Routing Context */}
      <main className="h-screen w-screen pt-10">
        <Router />
      </main>

      {/* Global Notifications */}
      <Toaster />
    </div>
  );
}

export default App;