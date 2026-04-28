import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@rs/utils';

/** Normalized fader value (0–1) that aligns the cap with the printed “0” unity mark. */
export const MIXER_FADER_UNITY_VALUE = 2 / 3;

export type KnobTone = 'input' | 'eq' | 'aux' | 'neutral';

/** Arc from ~7 o'clock to ~5 o'clock (same as rotation math). */
const ARC_START_DEG = -140;
const ARC_SWEEP_DEG = 280;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

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

export function LedMeter({
  level,
  peak,
  rms,
  className,
}: {
  /** Legacy single level (peak). */
  level?: number;
  peak?: number;
  rms?: number;
  className?: string;
}) {
  const segs = 20;
  const peakV = peak ?? level ?? 0;
  const rmsV = Math.min(peakV, rms ?? peakV * 0.92);
  const peakLit = Math.round(Math.max(0, Math.min(1, peakV)) * segs);
  const rmsLit = Math.round(Math.max(0, Math.min(1, rmsV)) * segs);
  return (
    <div
      className={cn(
        'flex h-16 w-full max-w-[22px] flex-col-reverse gap-px rounded border border-white/10 bg-black/50 p-px',
        className
      )}
      title={`Peak ${(peakV * 100).toFixed(0)}% · RMS ${(rmsV * 100).toFixed(0)}%`}
    >
      {Array.from({ length: segs }, (_, i) => {
        const on = i < peakLit;
        const inRms = i < rmsLit;
        const crest = on && !inRms;
        const gRms =
          i < 4 ? 'bg-emerald-600/90' : i < 10 ? 'bg-lime-500/85' : i < 12 ? 'bg-amber-400/80' : 'bg-red-500/90';
        const gPeak =
          i < 4 ? 'bg-emerald-300' : i < 10 ? 'bg-lime-200' : i < 12 ? 'bg-amber-200' : 'bg-red-300';
        return (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-[1px] transition-colors',
              !on && 'bg-zinc-800',
              on &&
                (crest
                  ? cn(gPeak, 'shadow-[0_0_8px_rgba(255,220,120,0.55)]')
                  : cn(gRms, 'shadow-[0_0_5px_rgba(52,211,153,0.35)]'))
            )}
          />
        );
      })}
    </div>
  );
}

function formatFreqTick(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) {
    const k = n / 1000;
    const s = k >= 10 || Math.abs(k - Math.round(k)) < 0.05 ? k.toFixed(0) : k.toFixed(1);
    return `${s} kHz`;
  }
  return `${Math.round(n)} Hz`;
}

function QBellIcon({ narrow, className }: { narrow: boolean; className?: string }) {
  return (
    <path
      className={className}
      fill="currentColor"
      d={
        narrow
          ? 'M-3.2 2.2 Q0 -4.2 3.2 2.2 Q0 0.6 -3.2 2.2 Z'
          : 'M-5.5 2.4 Q0 -2.8 5.5 2.4 Q0 1.2 -5.5 2.4 Z'
      }
    />
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
  unityAt,
  arcAnnotations,
  numberFormat = 'int',
  showQBellIcons,
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
  /** When set, draws a tick on the arc at this absolute value (e.g. trim unity at 1.0). */
  unityAt?: number;
  /** Extra ticks / labels along the arc; `t` is 0..1 mapped over the knob travel. */
  arcAnnotations?: { t: number; label: string }[];
  /** How min/max labels are drawn on the arc. */
  numberFormat?: 'int' | 'freq';
  /** For Q controls: narrow bell at min travel, broad bell at max (icons on arc ends). */
  showQBellIcons?: boolean;
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
  const rot = ARC_START_DEG + Math.max(0, Math.min(1, t)) * ARC_SWEEP_DEG;

  const sizePx = compact ? 32 : 36;
  const cx = sizePx / 2;
  const cy = sizePx / 2;
  const rOuter = sizePx * 0.48;
  const rTicks = sizePx * 0.42;
  const tickMarks = 11;
  const formatEnd = (n: number) => {
    if (numberFormat === 'freq') return formatFreqTick(n);
    if (Math.abs(n) >= 1000 && n === Math.round(n)) return `${Math.round(n / 1000)}k`;
    if (Math.abs(n) < 10 && n !== Math.round(n)) return n.toFixed(1);
    return String(Math.round(n));
  };

  const hashEls: React.ReactNode[] = [];
  for (let i = 0; i < tickMarks; i += 1) {
    const a = ARC_START_DEG + (i / (tickMarks - 1)) * ARC_SWEEP_DEG;
    const p0 = polarToCartesian(cx, cy, rOuter - 1, a);
    const p1 = polarToCartesian(cx, cy, rTicks, a);
    hashEls.push(
      <line
        key={`h-${i}`}
        x1={p0.x}
        y1={p0.y}
        x2={p1.x}
        y2={p1.y}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={i === 0 || i === tickMarks - 1 ? 1.1 : 0.65}
        strokeLinecap="round"
      />
    );
  }

  const labelEls: React.ReactNode[] = [];
  const minPt = polarToCartesian(cx, cy, rOuter + (compact ? 5 : 6), ARC_START_DEG);
  const maxPt = polarToCartesian(
    cx,
    cy,
    rOuter + (compact ? 5 : 6),
    ARC_START_DEG + ARC_SWEEP_DEG
  );
  labelEls.push(
    <text
      key="min"
      x={minPt.x}
      y={minPt.y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-zinc-500"
      style={{ fontSize: compact ? 6 : 7 }}
    >
      {formatEnd(min)}
    </text>
  );
  labelEls.push(
    <text
      key="max"
      x={maxPt.x}
      y={maxPt.y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-zinc-500"
      style={{ fontSize: compact ? 6 : 7 }}
    >
      {formatEnd(max)}
    </text>
  );

  if (unityAt !== undefined && max > min) {
    const tu = Math.max(0, Math.min(1, (unityAt - min) / (max - min)));
    const au = ARC_START_DEG + tu * ARC_SWEEP_DEG;
    const ut = polarToCartesian(cx, cy, rTicks - 1, au);
    const ul = polarToCartesian(cx, cy, rOuter + (compact ? 4 : 5), au);
    hashEls.push(
      <line
        key="unity-line"
        x1={polarToCartesian(cx, cy, rOuter - 0.5, au).x}
        y1={polarToCartesian(cx, cy, rOuter - 0.5, au).y}
        x2={ut.x}
        y2={ut.y}
        stroke="rgba(251,191,36,0.75)"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    );
    labelEls.push(
      <text
        key="unity"
        x={ul.x}
        y={ul.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-amber-400/90"
        style={{ fontSize: compact ? 5.5 : 6.5, fontWeight: 700 }}
      >
        U
      </text>
    );
  }

  if (arcAnnotations) {
    for (const ann of arcAnnotations) {
      const ta = Math.max(0, Math.min(1, ann.t));
      const ang = ARC_START_DEG + ta * ARC_SWEEP_DEG;
      const lp = polarToCartesian(cx, cy, rOuter + (compact ? 7 : 8), ang);
      labelEls.push(
        <text
          key={`ann-${ann.label}`}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-sky-300/80"
          style={{ fontSize: compact ? 5 : 6 }}
        >
          {ann.label}
        </text>
      );
    }
  }

  const qBellEls: React.ReactNode[] = [];
  if (showQBellIcons) {
    const pN = polarToCartesian(cx, cy, rOuter + (compact ? 5 : 6), ARC_START_DEG);
    const pB = polarToCartesian(cx, cy, rOuter + (compact ? 5 : 6), ARC_START_DEG + ARC_SWEEP_DEG);
    qBellEls.push(
      <g key="q-narrow" transform={`translate(${pN.x},${pN.y})`} className="text-sky-400/75">
        <QBellIcon narrow />
      </g>
    );
    qBellEls.push(
      <g key="q-broad" transform={`translate(${pB.x},${pB.y})`} className="text-sky-300/75">
        <QBellIcon narrow={false} />
      </g>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-0.5',
        compact ? 'w-[40px]' : 'w-[52px]',
        className
      )}
    >
      <div
        className="relative touch-none select-none"
        style={{ width: sizePx, height: sizePx }}
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
        <svg
          width={sizePx}
          height={sizePx}
          className="absolute inset-0 overflow-visible"
          aria-hidden
        >
          {hashEls}
          {labelEls}
          {qBellEls}
        </svg>
        <div className="absolute inset-[10%] rounded-full border border-zinc-700/80 bg-[#0c0e12] shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)]" />
        <div
          className={cn(
            'absolute rounded-full border bg-gradient-to-b shadow-inner',
            compact ? 'inset-[22%]' : 'inset-[24%]',
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
      {label || sublabel ? (
        <span
          className={cn(
            'text-center font-bold uppercase leading-tight text-zinc-400',
            compact ? 'text-[8px]' : 'text-[9px]'
          )}
        >
          {label ? (
            <>
              {label}
              {sublabel ? (
                <span className="block font-semibold normal-case text-zinc-500">{sublabel}</span>
              ) : null}
            </>
          ) : (
            <span className="block font-semibold normal-case text-zinc-500">{sublabel}</span>
          )}
        </span>
      ) : null}
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
  /** Initial / fallback travel; actual cap travel follows measured track height. */
  travelPx?: number;
  heightClass?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; grabDy: number } | null>(null);
  const [railUsable, setRailUsable] = useState(travelPx);

  const capCls =
    accent === 'red'
      ? 'from-rose-100 via-rose-300 to-rose-700 border-rose-900/70'
      : accent === 'cyan'
        ? 'from-slate-100 via-cyan-100 to-slate-500 border-slate-800/70'
        : 'from-zinc-100 via-zinc-300 to-zinc-600 border-zinc-800/70';
  const marks = ['+10', '+5', '0', '-5', '-10', '-20', '∞'];

  const PAD = 8;
  const CAP_H = 16;

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRailUsable(Math.max(24, r.height - PAD * 2 - CAP_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [heightClass]);

  const metrics = () => {
    const el = trackRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const usable = Math.max(24, r.height - PAD * 2 - CAP_H);
    return { r, usable };
  };

  const valueFromCapCenterY = (capCenterY: number) => {
    const m = metrics();
    if (!m) return value;
    const topCapCenter = m.r.top + PAD + CAP_H / 2;
    const t = (capCenterY - topCapCenter) / m.usable;
    return clamp01(1 - t);
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative mx-auto flex w-9 cursor-ns-resize touch-none select-none items-center justify-center rounded border border-white/10 bg-[#0a0a0a]',
        heightClass,
        className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const m = metrics();
        if (!m) return;
        const capCenter = m.r.top + PAD + CAP_H / 2 + (1 - value) * m.usable;
        const dist = Math.abs(e.clientY - capCenter);
        let grabDy = e.clientY - capCenter;
        if (dist > CAP_H * 0.65) {
          const next = valueFromCapCenterY(e.clientY);
          onChange(next);
          const cc2 = m.r.top + PAD + CAP_H / 2 + (1 - next) * m.usable;
          grabDy = e.clientY - cc2;
        }
        dragRef.current = { pointerId: e.pointerId, grabDy };
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d || d.pointerId !== e.pointerId || !e.currentTarget.hasPointerCapture(e.pointerId))
          return;
        const next = valueFromCapCenterY(e.clientY - d.grabDy);
        onChange(next);
      }}
      onPointerUp={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        dragRef.current = null;
      }}
      onPointerCancel={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        dragRef.current = null;
      }}
    >
      <div className="pointer-events-none absolute left-1 top-2 bottom-2 w-[2px] rounded bg-zinc-700/70" />
      <div className="pointer-events-none absolute right-[3px] top-2 bottom-2 flex flex-col justify-between text-[6px] text-zinc-500">
        {marks.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 h-4 w-7 -translate-x-1/2 rounded border bg-gradient-to-b shadow',
          capCls
        )}
        style={{ top: `${PAD + (1 - value) * railUsable}px` }}
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
