import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Headphones, VolumeX } from 'lucide-react';
import { audioEngine } from '@/lib/audio-engine-v2';
import type { MixerRoute } from '@/lib/foundational-mixer-graph';
import { cn } from '@/lib/utils';
import SubgroupStrip from './SubgroupStrip';
import {
  BusCompNeedle,
  GlowBtn,
  HpfSchematicIcon,
  HiFiKnob,
  LedMeter,
  LongThrowFader,
} from './mixer-primitives';

const ROUTES: MixerRoute[] = ['master', 'sub12', 'sub34', 'sub56', 'sub78'];

type CollapsibleSection = 'input' | 'dyn' | 'eq' | 'aux' | 'fader';

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

export interface ProfessionalMixerConsoleProps {
  className?: string;
  minimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

const ProfessionalMixerConsole: React.FC<ProfessionalMixerConsoleProps> = ({
  className,
  minimized = false,
  onMinimizedChange,
}) => {
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
  const [subSolo, setSubSolo] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);
  const [subAssignMain, setSubAssignMain] = useState<[boolean, boolean, boolean, boolean]>([
    true,
    true,
    true,
    true,
  ]);
  const [subEqHigh, setSubEqHigh] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [subEqLow, setSubEqLow] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [subEqHighFreq, setSubEqHighFreq] = useState<[number, number, number, number]>([
    8000, 8000, 8000, 8000,
  ]);
  const [subEqLowFreq, setSubEqLowFreq] = useState<[number, number, number, number]>([
    120, 120, 120, 120,
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
      audioEngine.setFoundationalMixerSubgroupParam(s, 'solo', subSolo[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'assignMain', subAssignMain[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'eqHigh', subEqHigh[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'eqLow', subEqLow[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'eqHighFreq', subEqHighFreq[s]!);
      audioEngine.setFoundationalMixerSubgroupParam(s, 'eqLowFreq', subEqLowFreq[s]!);
    }
  }, [
    subFaders,
    subPan,
    subMute,
    subSolo,
    subAssignMain,
    subEqHigh,
    subEqLow,
    subEqHighFreq,
    subEqLowFreq,
  ]);

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

  const masterLvl =
    meterFrame >= 0 ? audioEngine.getFoundationalMixerMasterMeter() : 0;

  if (minimized) {
    return (
      <div
        className={cn(
          'relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-t-lg p-[3px]',
          'bg-gradient-to-b from-[#3d2818] via-[#2a1810] to-[#1a0f0a] shadow-[0_-4px_20px_rgba(0,0,0,0.55)]',
          className
        )}
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        <button
          type="button"
          aria-expanded={false}
          aria-label="Restore mixer"
          onClick={() => onMinimizedChange?.(false)}
          className="absolute left-1/2 top-1 z-20 flex h-5 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-800/60 bg-[#2a1810] text-amber-100 shadow-md transition-transform hover:scale-105"
        >
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <div className="flex h-full w-full items-center justify-center gap-6 rounded-t-md bg-zinc-950 px-4 ring-1 ring-black/50">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-200/80">
            Master
          </span>
          <div className="flex items-end gap-2">
            <span className="pb-1 text-[6px] font-bold text-zinc-600">L</span>
            <LedMeter level={masterLvl} className="h-10 max-w-[16px]" />
            <span className="pb-1 text-[6px] font-bold text-zinc-600">R</span>
            <LedMeter level={masterLvl} className="h-10 max-w-[16px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-0 shrink-0 flex-col rounded-t-lg p-[3px] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]',
        'bg-gradient-to-b from-[#3d2818] via-[#2a1810] to-[#1a0f0a]',
        className
      )}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <button
        type="button"
        aria-label="Minimize mixer"
        onClick={() => onMinimizedChange?.(true)}
        className="absolute left-1/2 top-0 z-30 flex h-5 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-800/55 bg-[#2a1810] text-amber-100 shadow-lg transition-transform hover:scale-105"
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-md bg-zinc-950 ring-1 ring-black/55">
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
        <div className="flex min-w-max items-stretch gap-0.5 px-2 py-2 pt-9">
          {chIndices.map((idx) => {
            const ch = channels[idx - 1]!;
            const level =
              meterFrame >= 0 ? audioEngine.getFoundationalMixerChannelMeter(idx) : 0;
            return (
              <div
                key={idx}
                className="flex min-w-[100px] w-[100px] shrink-0 flex-col rounded-md border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-1 shadow-inner"
              >
                <div className="mb-0.5 flex justify-center">
                  <LedMeter level={level} className="h-14 max-w-[20px]" />
                </div>
                <div className="text-center text-[8px] font-bold text-zinc-500">CH {idx}</div>

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
                        compact
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
                        <HpfSchematicIcon className="mx-auto h-3.5 w-[26px] text-current" />
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
                    <div className="flex justify-center gap-0.5">
                      <HiFiKnob
                        compact
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
                        compact
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
                        compact
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
                    <div className="flex justify-center gap-1 py-1">
                      <GlowBtn
                        active={ch.mute}
                        ariaLabel="Mute channel"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          const v = !ch.mute;
                          applyChannel(idx, { mute: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'mute', v);
                        }}
                      >
                        <VolumeX className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </GlowBtn>
                      <GlowBtn
                        active={ch.solo}
                        ariaLabel="Solo channel"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          const v = !ch.solo;
                          applyChannel(idx, { solo: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'solo', v);
                        }}
                      >
                        <Headphones className="h-3.5 w-3.5" strokeWidth={2.2} />
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

          <div className="sticky right-0 flex h-full min-h-0 max-h-full w-[248px] shrink-0 flex-col rounded-md border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-2 shadow-lg ring-1 ring-black/40">
            <div className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-amber-200/80">
              Master
            </div>
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden border-t border-white/10 pt-2 pr-0.5 [scrollbar-gutter:stable]">
              <div className="text-[8px] font-bold uppercase text-zinc-500">Subgroup buses</div>
              <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto pb-1 pt-0.5 [scrollbar-gutter:stable]">
                {(['1–2', '3–4', '5–6', '7–8'] as const).map((label, s) => (
                  <SubgroupStrip
                    key={label}
                    label={label}
                    fader={subFaders[s]!}
                    pan={subPan[s]!}
                    mute={subMute[s]!}
                    solo={subSolo[s]!}
                    assignMain={subAssignMain[s]!}
                    eqHigh={subEqHigh[s]!}
                    eqLow={subEqLow[s]!}
                    eqHighFreq={subEqHighFreq[s]!}
                    eqLowFreq={subEqLowFreq[s]!}
                    meterLevel={
                      meterFrame >= 0 ? audioEngine.getFoundationalMixerSubgroupMeter(s) : 0
                    }
                    onFader={(v) =>
                      setSubFaders((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onPan={(v) =>
                      setSubPan((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onMute={(v) =>
                      setSubMute((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onSolo={(v) =>
                      setSubSolo((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onAssignMain={(v) =>
                      setSubAssignMain((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onEqHigh={(v) =>
                      setSubEqHigh((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onEqLow={(v) =>
                      setSubEqLow((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onEqHighFreq={(v) =>
                      setSubEqHighFreq((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                    onEqLowFreq={(v) =>
                      setSubEqLowFreq((p) => {
                        const n = [...p] as typeof p;
                        n[s] = v;
                        return n;
                      })
                    }
                  />
                ))}
              </div>
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
                <div className="mt-1 flex w-full items-end justify-center gap-2">
                  <LongThrowFader value={masterFader} onChange={setMasterFader} accent="red" />
                  <div className="flex gap-1 pb-1">
                    <LedMeter level={masterLvl} className="h-20 max-w-[18px]" />
                    <LedMeter level={masterLvl} className="h-20 max-w-[18px]" />
                  </div>
                </div>
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
