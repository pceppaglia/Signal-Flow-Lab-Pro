import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

export type KnobTone = 'input' | 'eq' | 'aux' | 'neutral';

export function HpfSchematicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" className={className} aria-hidden fill="none">
      <path
        d="M4 16 L10 4 L20 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LedMeter({ level, className }: { level: number; className?: string }) {
  const segs = 20;
  const lit = Math.round(level * segs);
  return (
    <div
      className={cn(
        'flex h-16 w-full max-w-[22px] flex-col-reverse gap-px rounded border border-white/10 bg-black/50 p-px',
        className
      )}
    >
      {Array.from({ length: segs }, (_, i) => {
        const on = i < lit;
        const g =
          i < 4 ? 'bg-emerald-500' : i < 10 ? 'bg-lime-400' : i < 12 ? 'bg-amber-400' : 'bg-red-500';
        return (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-[1px] transition-colors',
              on ? cn(g, 'shadow-[0_0_6px_rgba(120,255,160,0.55)]') : 'bg-zinc-800'
            )}
          />
        );
      })}
    </div>
  );
}

export function HiFiKnob({
  label,
  sublabel,
  value,
  min,
  max,
  tone = 'neutral',
  onChange,
  className,
  compact,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  tone?: KnobTone;
  onChange: (v: number) => void;
  className?: string;
  compact?: boolean;
}) {
  const drag = useRef<{ startY: number; startV: number } | null>(null);
  const ringCls =
    tone === 'input'
      ? 'border-red-900/55 from-zinc-600/90 to-zinc-900'
      : tone === 'eq'
        ? 'border-sky-900/50 from-sky-900/40 to-zinc-900'
        : tone === 'aux'
          ? 'border-emerald-900/45 from-emerald-900/35 to-zinc-900'
          : 'border-amber-900/40 from-zinc-600/80 to-zinc-900';
  const t = max > min ? (value - min) / (max - min) : 0;
  const rot = -140 + Math.max(0, Math.min(1, t)) * 280;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5',
        compact ? 'w-[38px]' : 'w-[48px]',
        className
      )}
    >
      <div
        className={cn(
          'relative touch-none select-none',
          compact ? 'h-8 w-8' : 'h-9 w-9'
        )}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { startY: e.clientY, startV: value };
        }}
        onPointerMove={(e) => {
          if (!drag.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const dy = drag.current.startY - e.clientY;
          const sens = (max - min) / 110;
          onChange(Math.min(max, Math.max(min, drag.current.startV + dy * sens)));
        }}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          drag.current = null;
        }}
        onPointerCancel={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          drag.current = null;
        }}
      >
        <div className="absolute inset-0 rounded-full border border-zinc-700/80 bg-[#0c0e12] shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)]" />
        <div
          className={cn(
            'absolute rounded-full border bg-gradient-to-b shadow-inner',
            compact ? 'inset-[2px]' : 'inset-[3px]',
            ringCls
          )}
          style={{ transform: `rotate(${rot}deg)` }}
        >
          <div
            className={cn(
              'absolute left-1/2 top-0.5 -translate-x-1/2 rounded-full bg-amber-100/95 shadow-sm',
              compact ? 'h-1.5 w-[2px]' : 'h-2 w-[3px]'
            )}
          />
        </div>
      </div>
      <span
        className={cn(
          'text-center font-bold uppercase leading-tight text-zinc-500',
          compact ? 'text-[5px]' : 'text-[6px]'
        )}
      >
        {label}
        {sublabel ? (
          <span className="block font-semibold normal-case text-zinc-600">{sublabel}</span>
        ) : null}
      </span>
    </div>
  );
}

export function GlowBtn({
  active,
  children,
  onClick,
  className,
  ariaLabel,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded border px-1 py-0.5 text-[8px] font-bold uppercase transition-all',
        active
          ? 'border-amber-400/60 bg-amber-500/25 text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
          : 'border-white/15 bg-black/40 text-zinc-400 hover:border-white/25',
        className
      )}
    >
      {children}
    </button>
  );
}

export function LongThrowFader({
  value,
  onChange,
  accent = 'amber',
  className,
  travelPx = 112,
  heightClass = 'h-36',
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: 'amber' | 'red' | 'cyan';
  className?: string;
  travelPx?: number;
  heightClass?: string;
}) {
  const capCls =
    accent === 'red'
      ? 'from-rose-100 via-rose-300 to-rose-700 border-rose-900/70'
      : accent === 'cyan'
        ? 'from-slate-100 via-cyan-100 to-slate-500 border-slate-800/70'
        : 'from-zinc-100 via-zinc-300 to-zinc-600 border-zinc-800/70';
  const marks = ['+10', '+5', '0', '-5', '-10', '-20', '∞'];
  return (
    <div
      className={cn(
        'relative mx-auto flex w-9 items-center justify-center rounded border border-white/10 bg-[#0a0a0a]',
        heightClass
      )}
    >
      <div className="absolute left-1 top-2 bottom-2 w-[2px] rounded bg-zinc-700/70" />
      <div className="absolute right-[3px] top-2 bottom-2 flex flex-col justify-between text-[6px] text-zinc-500">
        {marks.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn('absolute inset-0 h-full w-full cursor-pointer opacity-0', className)}
      />
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 h-4 w-7 -translate-x-1/2 rounded border bg-gradient-to-b shadow',
          capCls
        )}
        style={{ top: `${8 + (1 - value) * travelPx}px` }}
      >
        <div className="absolute left-1/2 top-0.5 h-3 w-px -translate-x-1/2 bg-black/60" />
      </div>
    </div>
  );
}

export function BusCompNeedle({ drive }: { drive: number }) {
  const ang = -60 + drive * 120;
  return (
    <div className="relative mx-auto h-14 w-24 rounded border border-white/15 bg-[#101215]">
      <div className="absolute inset-x-2 top-1 h-6 rounded bg-[#f3ecd7]" />
      <div
        className="absolute left-1/2 top-6 h-[2px] w-8 origin-left bg-red-700"
        style={{ transform: `rotate(${ang}deg)` }}
      />
      <div className="absolute bottom-1 w-full text-center text-[7px] font-bold text-zinc-400">GR</div>
    </div>
  );
}
