import React from 'react';
import { cn } from '@/lib/utils';

export interface MonitoringModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'near' | 'far';
}

/**
 * Educational modal: monitor chain + impedance matching (power amp ↔ speakers).
 */
export const MonitoringModal: React.FC<MonitoringModalProps> = ({ open, onClose, mode }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monitoring-modal-title"
    >
      <div
        className={cn(
          'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-amber-500/35',
          'bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 shadow-2xl ring-1 ring-black/50'
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="monitoring-modal-title" className="text-sm font-bold uppercase tracking-wide text-amber-200">
              Monitoring chain
            </h2>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {mode === 'near' ? 'Near-field' : 'Far-field'} reference
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/15 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase text-zinc-300 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 text-[11px] leading-relaxed text-zinc-300">
          <p>
            Use this view to think about <span className="text-zinc-100">damping factor</span> and{' '}
            <span className="text-zinc-100">load impedance</span>: the amplifier wants to see a stable
            nominal load; mismatches change frequency response, headroom, and distortion character.
          </p>

          <div className="rounded-lg border border-white/12 bg-black/40 p-3">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-amber-200/90">
              Example stack
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded border border-zinc-700/80 bg-zinc-900/80 p-2">
                <div className="text-[9px] font-bold text-zinc-500">Power amplifier</div>
                <div className="mt-1 font-mono text-[10px] text-zinc-200">Stereo · 120 W @ 4 Ω</div>
                <div className="mt-1 text-[9px] text-zinc-500">Output Z (typ.): low (&lt; 0.1 Ω)</div>
              </div>
              <div className="rounded border border-zinc-700/80 bg-zinc-900/80 p-2">
                <div className="text-[9px] font-bold text-zinc-500">Loudspeakers</div>
                <div className="mt-1 font-mono text-[10px] text-zinc-200">
                  {mode === 'near' ? 'Near-field · 8 Ω nominal' : 'Far-field · 4 Ω nominal'}
                </div>
                <div className="mt-1 text-[9px] text-zinc-500">Program power handling: match amp + crest</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-sky-500/25 bg-sky-950/25 p-3">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-sky-200/90">
              Quick impedance check
            </div>
            <ul className="list-disc space-y-1 pl-4 text-zinc-400">
              <li>Parallel speakers: combined Z drops (e.g. two 8 Ω → 4 Ω).</li>
              <li>Long cable runs add resistance; treble can tilt slightly.</li>
              <li>
                When in doubt, stay within the amp&apos;s rated load (often 4–8 Ω) and avoid dipping
                below minimum.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
