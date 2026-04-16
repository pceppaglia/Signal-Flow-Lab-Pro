import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/lib/audio-engine-v2';
import type { MixerRoute } from '@/lib/foundational-mixer-graph';
import { cn } from '@/lib/utils';

const ROUTES: MixerRoute[] = ['master', 'sub12', 'sub34', 'sub56', 'sub78'];

type CollapsibleSection = 'input' | 'dyn' | 'eq' | 'aux' | 'fader';
type KnobTone = 'input' | 'eq' | 'aux' | 'neutral';

interface ChannelUI {
  trim: number;
  micLine: 'mic' | 'line';
  pad: boolean;
  polarity: boolean;
  hpf: boolean;
  phantom: boolean;
  dynBypass: boolean;
  compThresh: number;
  compRatio: number;
  eqHigh: number;
  eqHiMid: number;
  eqLoMid: number;
  eqLow: number;
  eqHighFreq: number;
  eqHiMidFreq: number;
  eqLoMidFreq: number;
  eqLowFreq: number;
  eqHiMidQ: number;
  eqLoMidQ: number;
  aux: [number, number, number, number];
  auxPre: [boolean, boolean, boolean, boolean];
  pan: number;
  mute: boolean;
  solo: boolean;
  fader: number;
  route: MixerRoute;
}

function defaultChannel(): ChannelUI {
  return {
    trim: 0.65,
    micLine: 'mic',
    pad: false,
    polarity: false,
    hpf: false,
    phantom: false,
    dynBypass: false,
    compThresh: -20,
    compRatio: 3,
    eqHigh: 0,
    eqHiMid: 0,
    eqLoMid: 0,
    eqLow: 0,
    eqHighFreq: 10000,
    eqHiMidFreq: 2500,
    eqLoMidFreq: 400,
    eqLowFreq: 120,
    eqHiMidQ: 1,
    eqLoMidQ: 1,
    aux: [0, 0, 0, 0],
    auxPre: [true, true, true, true],
    pan: 0,
    mute: false,
    solo: false,
    fader: 0.75,
    route: 'master',
  };
}

function HpfSchematicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 12"
      className={className}
      aria-hidden
      fill="none"
    >
      <path
        d="M2 9 C 5 9 7 3 11 3 S 17 8 20 2"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LedMeter({ level }: { level: number }) {
  const segs = 20;
  const lit = Math.round(level * segs);
  return (
    <div className="flex h-16 w-full max-w-[22px] flex-col-reverse gap-px rounded border border-white/10 bg-black/50 p-px">
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

function HiFiKnob({
  label,
  sublabel,
  value,
  min,
  max,
  tone = 'neutral',
  onChange,
  className,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  tone?: KnobTone;
  onChange: (v: number) => void;
  className?: string;
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
    <div className={cn('flex w-[48px] flex-col items-center gap-0.5', className)}>
      <div
        className="relative h-9 w-9 touch-none select-none"
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
            'absolute inset-[3px] rounded-full border bg-gradient-to-b shadow-inner',
            ringCls
          )}
          style={{ transform: `rotate(${rot}deg)` }}
        >
          <div className="absolute left-1/2 top-0.5 h-2 w-[3px] -translate-x-1/2 rounded-full bg-amber-100/95 shadow-sm" />
        </div>
      </div>
      <span className="text-center text-[6px] font-bold uppercase leading-tight text-zinc-500">
        {label}
        {sublabel ? (
          <span className="block font-semibold normal-case text-zinc-600">{sublabel}</span>
        ) : null}
      </span>
    </div>
  );
}

function GlowBtn({
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
        'rounded border px-1 py-0.5 text-[8px] font-bold uppercase transition-all',
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

function SectionHead({
  label,
  collapsed,
  summary,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  summary?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-1 w-full rounded bg-gradient-to-r from-zinc-700/50 to-zinc-800/30 px-1 py-0.5 text-left text-[8px] font-bold uppercase tracking-widest text-zinc-300 hover:from-zinc-600/60"
    >
      <span>
        {label} {collapsed ? '▸' : '▾'}
      </span>
      {collapsed && summary ? (
        <span className="ml-1 inline-flex items-center gap-1 text-[7px] text-emerald-300/85">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          {summary}
        </span>
      ) : null}
    </button>
  );
}

function LongThrowFader({
  value,
  onChange,
  accent = 'amber',
}: {
  value: number;
  onChange: (v: number) => void;
  accent?: 'amber' | 'red' | 'cyan';
}) {
  const capCls =
    accent === 'red'
      ? 'from-rose-100 via-rose-300 to-rose-700 border-rose-900/70'
      : accent === 'cyan'
        ? 'from-slate-100 via-cyan-100 to-slate-500 border-slate-800/70'
        : 'from-zinc-100 via-zinc-300 to-zinc-600 border-zinc-800/70';
  const marks = ['+10', '+5', '0', '-5', '-10', '-20', '∞'];
  return (
    <div className="relative mx-auto flex h-36 w-9 items-center justify-center rounded border border-white/10 bg-[#0a0a0a]">
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
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 h-4 w-7 -translate-x-1/2 rounded border bg-gradient-to-b shadow',
          capCls
        )}
        style={{ top: `${8 + (1 - value) * 112}px` }}
      >
        <div className="absolute left-1/2 top-0.5 h-3 w-px -translate-x-1/2 bg-black/60" />
      </div>
    </div>
  );
}

function BusCompNeedle({ drive }: { drive: number }) {
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

const ProfessionalMixerConsole: React.FC<{ className?: string }> = ({ className }) => {
  const [channelCount, setChannelCount] = useState(4);
  const [meterFrame, setMeterFrame] = useState(0);
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<CollapsibleSection, boolean>>({
    input: false,
    dyn: false,
    eq: false,
    aux: false,
    fader: false,
  });
  const [channels, setChannels] = useState<ChannelUI[]>(() =>
    Array.from({ length: 24 }, () => defaultChannel())
  );
  const [monitor, setMonitor] = useState<'near' | 'far'>('near');
  const [masterFader, setMasterFader] = useState(0.85);
  const [masterMute, setMasterMute] = useState(false);
  const [busDrive, setBusDrive] = useState(0.45);
  const [auxRet, setAuxRet] = useState<[number, number, number, number]>([0.35, 0.35, 0.35, 0.35]);
  const [subFaders, setSubFaders] = useState<[number, number, number, number]>([
    0.85, 0.85, 0.85, 0.85,
  ]);
  const [subPan, setSubPan] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [subMute, setSubMute] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);

  const toggleStripSection = useCallback((s: CollapsibleSection) => {
    setSectionCollapsed((prev) => ({ ...prev, [s]: !prev[s] }));
  }, []);

  const applyChannel = useCallback((idx1: number, partial: Partial<ChannelUI>) => {
    setChannels((prev) => {
      const next = [...prev];
      const cur = { ...next[idx1 - 1]!, ...partial };
      next[idx1 - 1] = cur;
      return next;
    });
  }, []);

  const syncChannelToEngine = useCallback((idx1: number, ch: ChannelUI) => {
    const e = audioEngine;
    e.setFoundationalMixerChannelParam(idx1, 'trim', ch.trim);
    e.setFoundationalMixerChannelParam(idx1, 'micLine', ch.micLine);
    e.setFoundationalMixerChannelParam(idx1, 'pad', ch.pad);
    e.setFoundationalMixerChannelParam(idx1, 'polarity', ch.polarity);
    e.setFoundationalMixerChannelParam(idx1, 'hpf', ch.hpf);
    e.setFoundationalMixerChannelParam(idx1, 'dynBypass', ch.dynBypass);
    e.setFoundationalMixerChannelParam(idx1, 'compThresh', ch.compThresh);
    e.setFoundationalMixerChannelParam(idx1, 'compRatio', ch.compRatio);
    e.setFoundationalMixerChannelParam(idx1, 'eqHigh', ch.eqHigh);
    e.setFoundationalMixerChannelParam(idx1, 'eqHiMid', ch.eqHiMid);
    e.setFoundationalMixerChannelParam(idx1, 'eqLoMid', ch.eqLoMid);
    e.setFoundationalMixerChannelParam(idx1, 'eqLow', ch.eqLow);
    e.setFoundationalMixerChannelParam(idx1, 'eqHighFreq', ch.eqHighFreq);
    e.setFoundationalMixerChannelParam(idx1, 'eqHiMidFreq', ch.eqHiMidFreq);
    e.setFoundationalMixerChannelParam(idx1, 'eqLoMidFreq', ch.eqLoMidFreq);
    e.setFoundationalMixerChannelParam(idx1, 'eqLowFreq', ch.eqLowFreq);
    e.setFoundationalMixerChannelParam(idx1, 'eqHiMidQ', ch.eqHiMidQ);
    e.setFoundationalMixerChannelParam(idx1, 'eqLoMidQ', ch.eqLoMidQ);
    for (let a = 0; a < 4; a += 1) {
      e.setFoundationalMixerChannelParam(idx1, `aux${a + 1}` as 'aux1', ch.aux[a]!);
      e.setFoundationalMixerChannelParam(
        idx1,
        `aux${a + 1}Pre` as 'aux1Pre',
        ch.auxPre[a]!
      );
    }
    e.setFoundationalMixerChannelParam(idx1, 'pan', ch.pan);
    e.setFoundationalMixerChannelParam(idx1, 'mute', ch.mute);
    e.setFoundationalMixerChannelParam(idx1, 'solo', ch.solo);
    e.setFoundationalMixerChannelParam(idx1, 'fader', ch.fader);
    e.setFoundationalMixerChannelParam(idx1, 'route', ch.route);
  }, []);

  useEffect(() => {
    void audioEngine.start();
    audioEngine.ensureFoundationalMixer();
    audioEngine.setFoundationalMixerChannelCount(channelCount);
    for (let i = 1; i <= 24; i += 1) {
      syncChannelToEngine(i, channels[i - 1]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time DSP bootstrap
  }, []);

  useEffect(() => {
    audioEngine.setFoundationalMixerChannelCount(channelCount);
  }, [channelCount]);

  useEffect(() => {
    audioEngine.setFoundationalMixerMasterParam('monitor', monitor);
  }, [monitor]);

  useEffect(() => {
    audioEngine.setFoundationalMixerMasterParam('masterFader', masterFader);
  }, [masterFader]);

  useEffect(() => {
    audioEngine.setFoundationalMixerMasterParam('masterMute', masterMute);
  }, [masterMute]);

  useEffect(() => {
    audioEngine.setFoundationalMixerMasterParam('busDrive', busDrive);
  }, [busDrive]);

  useEffect(() => {
    for (let i = 0; i < 4; i += 1) {
      audioEngine.setFoundationalMixerMasterParam(
        `auxReturn${i + 1}` as 'auxReturn1',
        auxRet[i]!
      );
    }
  }, [auxRet]);

  useEffect(() => {
    for (let s = 0; s < 4; s += 1) {
      audioEngine.setFoundationalMixerSubgroupParam(s, 'fader', subFaders[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'pan', subPan[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'mute', subMute[s]!);
    }
  }, [subFaders, subPan, subMute]);

  useEffect(() => {
    let r = 0;
    const loop = () => {
      setMeterFrame((x) => x + 1);
      r = requestAnimationFrame(loop);
    };
    r = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(r);
  }, []);

  const chIndices = Array.from({ length: channelCount }, (_, i) => i + 1);
  const cIn = sectionCollapsed.input;
  const cDyn = sectionCollapsed.dyn;
  const cEq = sectionCollapsed.eq;
  const cAux = sectionCollapsed.aux;
  const cFader = sectionCollapsed.fader;

  return (
    <div
      className={cn(
        'relative flex min-h-0 shrink-0 flex-col border-t border-amber-900/30 bg-gradient-to-b from-[#252a32] via-[#1c2026] to-[#14181c] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]',
        className
      )}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <button
        type="button"
        disabled={channelCount >= 24}
        onClick={() => setChannelCount((c) => Math.min(24, c + 1))}
        className={cn(
          'absolute right-3 top-2 z-20 rounded-full border px-2.5 py-0.5 text-[9px] font-bold shadow-md backdrop-blur-sm',
          channelCount >= 24
            ? 'cursor-not-allowed border-zinc-700/40 bg-zinc-900/50 text-zinc-600'
            : 'border-emerald-400/45 bg-emerald-600/25 text-emerald-100 hover:bg-emerald-600/35'
        )}
      >
        + CH
      </button>

      <div
        className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="flex min-w-max items-stretch gap-1 px-2 py-2 pt-9">
          {chIndices.map((idx) => {
            const ch = channels[idx - 1]!;
            const level =
              meterFrame >= 0 ? audioEngine.getFoundationalMixerChannelMeter(idx) : 0;
            return (
              <div
                key={idx}
                className="flex w-[128px] shrink-0 flex-col rounded-lg border border-white/10 bg-gradient-to-b from-[#2b3138] to-[#151a21] p-1.5 shadow-inner"
              >
                <div className="mb-1 flex justify-center">
                  <LedMeter level={level} />
                </div>
                <div className="text-center text-[9px] font-bold text-zinc-400">CH {idx}</div>

                <SectionHead
                  label="Input"
                  collapsed={cIn}
                  summary={ch.micLine === 'mic' ? 'MIC IN' : 'LINE IN'}
                  onToggle={() => toggleStripSection('input')}
                />
                {!cIn && (
                  <div className="mt-1 space-y-1 border-t border-white/5 pt-1">
                    <div className="flex justify-center">
                      <HiFiKnob
                        label="Trim"
                        value={ch.trim}
                        min={0}
                        max={1.5}
                        tone="input"
                        onChange={(v) => {
                          applyChannel(idx, { trim: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'trim', v);
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      <GlowBtn
                        active={ch.micLine === 'mic'}
                        onClick={() => {
                          applyChannel(idx, { micLine: 'mic' });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'micLine', 'mic');
                        }}
                      >
                        Mic
                      </GlowBtn>
                      <GlowBtn
                        active={ch.micLine === 'line'}
                        onClick={() => {
                          applyChannel(idx, { micLine: 'line' });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'micLine', 'line');
                        }}
                      >
                        Line
                      </GlowBtn>
                    </div>
                    <div className="flex flex-wrap justify-center gap-0.5">
                      <GlowBtn
                        active={ch.pad}
                        onClick={() => {
                          const v = !ch.pad;
                          applyChannel(idx, { pad: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'pad', v);
                        }}
                      >
                        −10
                      </GlowBtn>
                      <GlowBtn
                        active={ch.polarity}
                        onClick={() => {
                          const v = !ch.polarity;
                          applyChannel(idx, { polarity: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'polarity', v);
                        }}
                      >
                        Ø
                      </GlowBtn>
                      <GlowBtn
                        active={ch.hpf}
                        className="px-1 py-0.5"
                        ariaLabel="High-pass filter"
                        onClick={() => {
                          const v = !ch.hpf;
                          applyChannel(idx, { hpf: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'hpf', v);
                        }}
                      >
                        <HpfSchematicIcon className="mx-auto h-3 w-[22px] text-current" />
                      </GlowBtn>
                      <GlowBtn
                        active={ch.phantom}
                        onClick={() => {
                          const v = !ch.phantom;
                          applyChannel(idx, { phantom: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'phantom48', v);
                        }}
                        className="text-[7px]"
                      >
                        +48V
                      </GlowBtn>
                    </div>
                  </div>
                )}

                <SectionHead
                  label="Dynamics"
                  collapsed={cDyn}
                  summary={ch.dynBypass ? 'DYN BYP' : 'DYN IN'}
                  onToggle={() => toggleStripSection('dyn')}
                />
                {!cDyn && (
                  <div className="mt-1 space-y-1 border-t border-white/5 pt-1">
                    <GlowBtn
                      active={!ch.dynBypass}
                      onClick={() => {
                        const bypass = !ch.dynBypass;
                        applyChannel(idx, { dynBypass: bypass });
                        audioEngine.setFoundationalMixerChannelParam(idx, 'dynBypass', bypass);
                      }}
                      ariaLabel="Dynamics in or bypass"
                    >
                      {ch.dynBypass ? 'BYP' : 'IN'}
                    </GlowBtn>
                    <div className="flex justify-center gap-1">
                      <HiFiKnob
                        label="Thr"
                        value={ch.compThresh}
                        tone="input"
                        min={-40}
                        max={0}
                        onChange={(v) => {
                          applyChannel(idx, { compThresh: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'compThresh', v);
                        }}
                      />
                      <HiFiKnob
                        label="Ratio"
                        value={ch.compRatio}
                        tone="input"
                        min={1}
                        max={12}
                        onChange={(v) => {
                          applyChannel(idx, { compRatio: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'compRatio', v);
                        }}
                      />
                    </div>
                  </div>
                )}

                <SectionHead
                  label="EQ"
                  collapsed={cEq}
                  summary="EQ"
                  onToggle={() => toggleStripSection('eq')}
                />
                {!cEq && (
                  <div className="mt-1 space-y-0.5 border-t border-white/5 pt-1">
                    <div className="flex justify-start pl-0.5">
                      <HiFiKnob
                        label="HF"
                        sublabel="G ±15"
                        value={ch.eqHigh}
                        tone="eq"
                        min={-15}
                        max={15}
                        onChange={(v) => {
                          applyChannel(idx, { eqHigh: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqHigh', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-end pr-0.5">
                      <HiFiKnob
                        label="HF"
                        sublabel="F kHz"
                        value={ch.eqHighFreq}
                        tone="eq"
                        min={1500}
                        max={16000}
                        onChange={(v) => {
                          applyChannel(idx, { eqHighFreq: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqHighFreq', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-start pl-0.5">
                      <HiFiKnob
                        label="HMF"
                        sublabel="G"
                        value={ch.eqHiMid}
                        tone="eq"
                        min={-15}
                        max={15}
                        onChange={(v) => {
                          applyChannel(idx, { eqHiMid: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqHiMid', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-end pr-0.5">
                      <HiFiKnob
                        label="HMF"
                        sublabel="F"
                        value={ch.eqHiMidFreq}
                        tone="eq"
                        min={600}
                        max={7000}
                        onChange={(v) => {
                          applyChannel(idx, { eqHiMidFreq: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqHiMidFreq', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-start pl-0.5">
                      <HiFiKnob
                        label="HMF"
                        sublabel="Q"
                        value={ch.eqHiMidQ}
                        tone="eq"
                        min={0.3}
                        max={6}
                        onChange={(v) => {
                          applyChannel(idx, { eqHiMidQ: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqHiMidQ', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-end pr-0.5">
                      <HiFiKnob
                        label="LMF"
                        sublabel="G"
                        value={ch.eqLoMid}
                        tone="eq"
                        min={-15}
                        max={15}
                        onChange={(v) => {
                          applyChannel(idx, { eqLoMid: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqLoMid', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-start pl-0.5">
                      <HiFiKnob
                        label="LMF"
                        sublabel="F"
                        value={ch.eqLoMidFreq}
                        tone="eq"
                        min={200}
                        max={2500}
                        onChange={(v) => {
                          applyChannel(idx, { eqLoMidFreq: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqLoMidFreq', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-end pr-0.5">
                      <HiFiKnob
                        label="LMF"
                        sublabel="Q"
                        value={ch.eqLoMidQ}
                        tone="eq"
                        min={0.3}
                        max={6}
                        onChange={(v) => {
                          applyChannel(idx, { eqLoMidQ: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqLoMidQ', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-start pl-0.5">
                      <HiFiKnob
                        label="LF"
                        sublabel="G ±15"
                        value={ch.eqLow}
                        tone="eq"
                        min={-15}
                        max={15}
                        onChange={(v) => {
                          applyChannel(idx, { eqLow: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqLow', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-end pr-0.5">
                      <HiFiKnob
                        label="LF"
                        sublabel="F Hz"
                        value={ch.eqLowFreq}
                        tone="eq"
                        min={30}
                        max={450}
                        onChange={(v) => {
                          applyChannel(idx, { eqLowFreq: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'eqLowFreq', v);
                        }}
                      />
                    </div>
                  </div>
                )}

                <SectionHead
                  label="Aux"
                  collapsed={cAux}
                  summary="AUX"
                  onToggle={() => toggleStripSection('aux')}
                />
                {!cAux && (
                  <div className="mt-1 space-y-0.5 border-t border-white/5 pt-1">
                    {[0, 1, 2, 3].map((a) => (
                      <div
                        key={a}
                        className={cn(
                          'flex items-end gap-0.5',
                          a % 2 === 0 ? 'justify-start pl-0.5' : 'justify-end pr-0.5'
                        )}
                      >
                        <HiFiKnob
                          label={`A${a + 1}`}
                          value={ch.aux[a]!}
                          tone="aux"
                          min={0}
                          max={1}
                          onChange={(v) => {
                            const aux = [...ch.aux] as ChannelUI['aux'];
                            aux[a] = v;
                            applyChannel(idx, { aux });
                            audioEngine.setFoundationalMixerChannelParam(
                              idx,
                              `aux${a + 1}` as 'aux1',
                              v
                            );
                          }}
                        />
                        <GlowBtn
                          active={ch.auxPre[a]!}
                          className="mb-1 px-0.5 text-[6px]"
                          onClick={() => {
                            const auxPre = [...ch.auxPre] as ChannelUI['auxPre'];
                            auxPre[a] = !auxPre[a];
                            applyChannel(idx, { auxPre });
                            audioEngine.setFoundationalMixerChannelParam(
                              idx,
                              `aux${a + 1}Pre` as 'aux1Pre',
                              auxPre[a]!
                            );
                          }}
                        >
                          {ch.auxPre[a] ? 'Pre' : 'Pst'}
                        </GlowBtn>
                      </div>
                    ))}
                  </div>
                )}

                <SectionHead
                  label="Fader"
                  collapsed={cFader}
                  summary={ch.route === 'master' ? 'ROUTE LR' : 'ROUTE SUB'}
                  onToggle={() => toggleStripSection('fader')}
                />
                {!cFader && (
                  <div className="mt-1 flex flex-1 flex-col border-t border-white/5 pt-1">
                    <div className="flex justify-center">
                      <HiFiKnob
                        label="Pan"
                        value={ch.pan}
                        tone="neutral"
                        min={-1}
                        max={1}
                        onChange={(v) => {
                          applyChannel(idx, { pan: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'pan', v);
                        }}
                      />
                    </div>
                    <div className="flex justify-center gap-0.5 py-1">
                      <GlowBtn
                        active={ch.mute}
                        onClick={() => {
                          const v = !ch.mute;
                          applyChannel(idx, { mute: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'mute', v);
                        }}
                      >
                        M
                      </GlowBtn>
                      <GlowBtn
                        active={ch.solo}
                        onClick={() => {
                          const v = !ch.solo;
                          applyChannel(idx, { solo: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'solo', v);
                        }}
                      >
                        S
                      </GlowBtn>
                    </div>
                    <LongThrowFader
                      value={ch.fader}
                      onChange={(v) => {
                        applyChannel(idx, { fader: v });
                        audioEngine.setFoundationalMixerChannelParam(idx, 'fader', v);
                      }}
                    />
                    <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                      {ROUTES.map((r) => (
                        <GlowBtn
                          key={r}
                          active={ch.route === r}
                          className="px-0.5 text-[6px]"
                          onClick={() => {
                            applyChannel(idx, { route: r });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'route', r);
                          }}
                        >
                          {r === 'master'
                            ? 'LR'
                            : r === 'sub12'
                              ? '1–2'
                              : r === 'sub34'
                                ? '3–4'
                                : r === 'sub56'
                                  ? '5–6'
                                  : '7–8'}
                        </GlowBtn>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="sticky right-0 flex h-full min-h-0 max-h-full w-[214px] shrink-0 flex-col rounded-lg border border-amber-700/30 bg-gradient-to-b from-[#2c323a] to-[#181c22] p-2 shadow-lg">
            <div className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-amber-200/80">
              Master
            </div>
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden border-t border-white/10 pt-2 pr-0.5 [scrollbar-gutter:stable]">
              <div className="text-[8px] font-bold text-zinc-500">Subgroups</div>
              {(['1–2', '3–4', '5–6', '7–8'] as const).map((label, s) => (
                <div
                  key={label}
                  className="flex items-end gap-2 rounded border border-white/5 bg-black/20 p-1.5"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[7px] font-bold text-zinc-500">{label}</span>
                    <HiFiKnob
                      label="Lvl"
                      value={subFaders[s]!}
                      min={0}
                      max={1}
                      tone="neutral"
                      onChange={(v) =>
                        setSubFaders((p) => {
                          const n = [...p] as typeof p;
                          n[s] = v;
                          return n;
                        })
                      }
                    />
                    <HiFiKnob
                      label="Pan"
                      value={subPan[s]!}
                      min={-1}
                      max={1}
                      tone="neutral"
                      onChange={(v) =>
                        setSubPan((p) => {
                          const n = [...p] as typeof p;
                          n[s] = v;
                          return n;
                        })
                      }
                    />
                    <GlowBtn
                      active={subMute[s]!}
                      className="text-[6px]"
                      onClick={() =>
                        setSubMute((p) => {
                          const n = [...p] as typeof p;
                          n[s] = !n[s];
                          return n;
                        })
                      }
                    >
                      M
                    </GlowBtn>
                  </div>
                  <LedMeter
                    level={
                      meterFrame >= 0
                        ? audioEngine.getFoundationalMixerSubgroupMeter(s)
                        : 0
                    }
                  />
                </div>
              ))}
              <div className="border-t border-white/10 pt-2">
                <div className="text-[8px] font-bold text-zinc-500">Aux masters</div>
                <div className="mt-1 grid grid-cols-2 gap-x-1 gap-y-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <HiFiKnob
                      key={i}
                      label={`R${i + 1}`}
                      value={auxRet[i]!}
                      min={0}
                      max={1}
                      tone="aux"
                      onChange={(v) =>
                        setAuxRet((p) => {
                          const n = [...p] as typeof p;
                          n[i] = v;
                          return n;
                        })
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1 border-t border-white/10 pt-2">
                <GlowBtn
                  active={monitor === 'near'}
                  onClick={() => setMonitor('near')}
                  ariaLabel="Near-fields"
                >
                  Near
                </GlowBtn>
                <GlowBtn
                  active={monitor === 'far'}
                  onClick={() => setMonitor('far')}
                  ariaLabel="Far-fields"
                >
                  Far
                </GlowBtn>
              </div>
              <div className="border-t border-white/10 pt-2">
                <div className="text-[8px] font-bold text-zinc-500">Bus comp (SSL-style)</div>
                <div className="mt-1 flex justify-center">
                  <HiFiKnob
                    label="Drive"
                    value={busDrive}
                    min={0}
                    max={1}
                    tone="input"
                    onChange={setBusDrive}
                  />
                </div>
                <BusCompNeedle drive={busDrive} />
              </div>
              <div className="flex flex-col items-center border-t border-white/10 pt-2">
                <GlowBtn active={masterMute} onClick={() => setMasterMute((m) => !m)}>
                  Mute
                </GlowBtn>
                <div className="mt-1">
                  <LongThrowFader value={masterFader} onChange={setMasterFader} accent="red" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMixerConsole;
