import React, { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lab-hide-studio-help';

export const InitialInstructions: React.FC = () => {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (hidden) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [hidden]);

  const toggle = useCallback(() => setHidden((v) => !v), []);

  if (hidden) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-[11px] text-zinc-500">Quick Start Guide is hidden.</p>
        <button
          type="button"
          onClick={toggle}
          className="rounded border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90 hover:bg-white/10"
        >
          Show guide
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-amber-200/90">
          Quick Start Guide
        </h2>
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded border border-white/10 bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase text-zinc-400 hover:text-zinc-200"
        >
          Hide
        </button>
      </div>
      <ul className="list-disc space-y-2 pl-4 text-[11px] leading-snug text-zinc-400">
        <li>
          Click the <span className="text-zinc-200">+</span> on the canvas or rack to open the{' '}
          <span className="text-zinc-200">Library</span> and add gear.
        </li>
        <li>
          Drag from a microphone&apos;s output to an input on the{' '}
          <span className="text-zinc-200">Mic Inputs</span> panel; the{' '}
          <span className="text-zinc-200">Patchbay</span> Mic Lines row shows what is patched.
        </li>
        <li>
          Use the <span className="text-zinc-200">Inspector</span> when a piece of gear is selected to
          tweak parameters.
        </li>
      </ul>
    </div>
  );
};
