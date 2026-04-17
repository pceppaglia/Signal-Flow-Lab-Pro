import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Headphones, VolumeX } from 'lucide-react';
import { audioEngine } from '@/lib/audio-engine-v2';
import type { MixerRoute } from '@/lib/foundational-mixer-graph';
import { cn } from '@/lib/utils';
import {
  BusCompNeedle,
  GlowBtn,
  HpfSchematicIcon,
  HiFiKnob,
  LedMeter,
  LongThrowFader,
  MIXER_FADER_UNITY_VALUE,
} from './mixer-primitives';
import { MonitoringModal } from './MonitoringModal';

const ROUTES: MixerRoute[] = ['master', 'sub12', 'sub34', 'sub56', 'sub78'];

const EQ_T_HIGH = (hz: number) => (hz - 1500) / (16000 - 1500);
const EQ_T_HIMID = (hz: number) => (hz - 600) / (7000 - 600);
const EQ_T_LOMID = (hz: number) => (hz - 200) / (2500 - 200);
const EQ_T_LOW = (hz: number) => (hz - 30) / (450 - 30);

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
    fader: MIXER_FADER_UNITY_VALUE,
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
  const [monitorModalOpen, setMonitorModalOpen] = useState(false);
  const [masterFader, setMasterFader] = useState(MIXER_FADER_UNITY_VALUE);
  const [masterMute, setMasterMute] = useState(false);
  const [busDrive, setBusDrive] = useState(0.45);
  const [auxRet, setAuxRet] = useState<[number, number, number, number]>([0.35, 0.35, 0.35, 0.35]);
  const [subFaders, setSubFaders] = useState<[number, number, number, number]>([
    MIXER_FADER_UNITY_VALUE,
    MIXER_FADER_UNITY_VALUE,
    MIXER_FADER_UNITY_VALUE,
    MIXER_FADER_UNITY_VALUE,
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

  const masterStereo =
    meterFrame >= 0
      ? audioEngine.getFoundationalMixerMasterMeterStereo()
      : { l: { peak: 0, rms: 0 }, r: { peak: 0, rms: 0 } };

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
            <LedMeter
              peak={masterStereo.l.peak}
              rms={masterStereo.l.rms}
              className="h-10 max-w-[16px]"
            />
            <span className="pb-1 text-[6px] font-bold text-zinc-600">R</span>
            <LedMeter
              peak={masterStereo.r.peak}
              rms={masterStereo.r.rms}
              className="h-10 max-w-[16px]"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex w-max max-w-full min-h-0 shrink-0 flex-col rounded-t-lg p-[3px] shadow-[0_-8px_32px_rgba(0,0,0,0.5)]',
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
      <MonitoringModal
        open={monitorModalOpen}
        onClose={() => setMonitorModalOpen(false)}
        mode={monitor}
      />
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

      <div className="flex min-h-0 flex-1 overflow-hidden" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex min-h-0 min-w-0 items-stretch gap-0">
        <div className="min-h-0 min-w-0 shrink overflow-x-auto overflow-y-auto">
        <div className="flex min-h-min min-w-max items-stretch gap-0.5 px-2 py-2 pt-9">
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
                    <div className="relative flex justify-center pt-5">
                      <div className="absolute left-0 top-0">
                        <GlowBtn
                          active={ch.phantom}
                          onClick={() => {
                            const v = !ch.phantom;
                            applyChannel(idx, { phantom: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'phantom48', v);
                          }}
                          className="px-1 py-0.5 text-[7px] leading-none"
                        >
                          +48V
                        </GlowBtn>
                      </div>
                      <HiFiKnob
                        compact
                        label="Trim"
                        value={ch.trim}
                        min={0}
                        max={1.5}
                        tone="input"
                        unityAt={1}
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
                  <div className="mt-1 space-y-1 border-t border-white/5 pt-1">
                    <div className="space-y-0.5 rounded-md border border-sky-500/25 bg-sky-950/20 px-0.5 py-1 shadow-[inset_0_0_12px_rgba(56,189,248,0.06)]">
                      <div className="px-0.5 text-[7px] font-bold tracking-widest text-sky-300/90">
                        HF
                      </div>
                      <div className="flex justify-start pl-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="±15 dB"
                          value={ch.eqHigh}
                          tone="eq"
                          min={-15}
                          max={15}
                          unityAt={0}
                          onChange={(v) => {
                            applyChannel(idx, { eqHigh: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqHigh', v);
                          }}
                        />
                      </div>
                      <div className="flex justify-end pr-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="Freq"
                          value={ch.eqHighFreq}
                          tone="eq"
                          min={1500}
                          max={16000}
                          numberFormat="freq"
                          arcAnnotations={[
                            { t: EQ_T_HIGH(4000), label: '4 kHz' },
                            { t: EQ_T_HIGH(10000), label: '10 kHz' },
                          ]}
                          onChange={(v) => {
                            applyChannel(idx, { eqHighFreq: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqHighFreq', v);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5 rounded-md border border-emerald-500/25 bg-emerald-950/18 px-0.5 py-1 shadow-[inset_0_0_12px_rgba(52,211,153,0.05)]">
                      <div className="px-0.5 text-[7px] font-bold tracking-widest text-emerald-300/90">
                        HMF
                      </div>
                      <div className="flex justify-start pl-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="±15 dB"
                          value={ch.eqHiMid}
                          tone="eq"
                          min={-15}
                          max={15}
                          unityAt={0}
                          onChange={(v) => {
                            applyChannel(idx, { eqHiMid: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqHiMid', v);
                          }}
                        />
                      </div>
                      <div className="flex justify-end pr-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="Freq"
                          value={ch.eqHiMidFreq}
                          tone="eq"
                          min={600}
                          max={7000}
                          numberFormat="freq"
                          arcAnnotations={[
                            { t: EQ_T_HIMID(1000), label: '1 kHz' },
                            { t: EQ_T_HIMID(4000), label: '4 kHz' },
                          ]}
                          onChange={(v) => {
                            applyChannel(idx, { eqHiMidFreq: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqHiMidFreq', v);
                          }}
                        />
                      </div>
                      <div className="flex justify-start pl-0.5">
                        <HiFiKnob
                          label=""
                          value={ch.eqHiMidQ}
                          tone="eq"
                          min={0.3}
                          max={6}
                          showQBellIcons
                          onChange={(v) => {
                            applyChannel(idx, { eqHiMidQ: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqHiMidQ', v);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5 rounded-md border border-amber-500/28 bg-amber-950/16 px-0.5 py-1 shadow-[inset_0_0_12px_rgba(251,191,36,0.06)]">
                      <div className="px-0.5 text-[7px] font-bold tracking-widest text-amber-200/90">
                        LMF
                      </div>
                      <div className="flex justify-end pr-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="±15 dB"
                          value={ch.eqLoMid}
                          tone="eq"
                          min={-15}
                          max={15}
                          unityAt={0}
                          onChange={(v) => {
                            applyChannel(idx, { eqLoMid: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqLoMid', v);
                          }}
                        />
                      </div>
                      <div className="flex justify-start pl-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="Freq"
                          value={ch.eqLoMidFreq}
                          tone="eq"
                          min={200}
                          max={2500}
                          numberFormat="freq"
                          arcAnnotations={[
                            { t: EQ_T_LOMID(400), label: '400 Hz' },
                            { t: EQ_T_LOMID(1000), label: '1 kHz' },
                          ]}
                          onChange={(v) => {
                            applyChannel(idx, { eqLoMidFreq: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqLoMidFreq', v);
                          }}
                        />
                      </div>
                      <div className="flex justify-end pr-0.5">
                        <HiFiKnob
                          label=""
                          value={ch.eqLoMidQ}
                          tone="eq"
                          min={0.3}
                          max={6}
                          showQBellIcons
                          onChange={(v) => {
                            applyChannel(idx, { eqLoMidQ: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqLoMidQ', v);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5 rounded-md border border-rose-800/35 bg-rose-950/22 px-0.5 py-1 shadow-[inset_0_0_12px_rgba(244,63,94,0.05)]">
                      <div className="px-0.5 text-[7px] font-bold tracking-widest text-rose-300/85">
                        LF
                      </div>
                      <div className="flex justify-start pl-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="±15 dB"
                          value={ch.eqLow}
                          tone="eq"
                          min={-15}
                          max={15}
                          unityAt={0}
                          onChange={(v) => {
                            applyChannel(idx, { eqLow: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqLow', v);
                          }}
                        />
                      </div>
                      <div className="flex justify-end pr-0.5">
                        <HiFiKnob
                          label=""
                          sublabel="Freq"
                          value={ch.eqLowFreq}
                          tone="eq"
                          min={30}
                          max={450}
                          numberFormat="freq"
                          arcAnnotations={[
                            { t: EQ_T_LOW(100), label: '100 Hz' },
                            { t: EQ_T_LOW(200), label: '200 Hz' },
                          ]}
                          onChange={(v) => {
                            applyChannel(idx, { eqLowFreq: v });
                            audioEngine.setFoundationalMixerChannelParam(idx, 'eqLowFreq', v);
                          }}
                        />
                      </div>
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
                    {[0, 1, 2, 3].map((a) => {
                      const knob = (
                        <HiFiKnob
                          label={`${a + 1}`}
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
                      );
                      const preBtn = (
                        <GlowBtn
                          active={ch.auxPre[a]!}
                          className={cn('px-0.5 text-[6px]', a % 2 === 0 ? 'mb-0 translate-y-0.5' : 'mb-0')}
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
                      );
                      const isOdd = a % 2 === 1;
                      return (
                        <div
                          key={a}
                          className={cn('flex items-end gap-0.5 justify-start', 'pl-0.5')}
                        >
                          {isOdd ? (
                            <>
                              {preBtn}
                              {knob}
                            </>
                          ) : (
                            <>
                              {knob}
                              {preBtn}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <SectionHead
                  label="Fader"
                  collapsed={cFader}
                  summary={ch.route === 'master' ? 'ROUTE LR' : 'ROUTE SUB'}
                  onToggle={() => toggleStripSection('fader')}
                />
                {!cFader && (
                  <div className="mt-1 flex flex-1 flex-col justify-end border-t border-white/5 pt-1">
                    <div className="flex justify-center">
                      <HiFiKnob
                        compact
                        label="Pan"
                        value={ch.pan}
                        tone="neutral"
                        min={-1}
                        max={1}
                        unityAt={0}
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
        </div>
        </div>

          <div className="relative flex h-full min-h-0 max-h-full w-max shrink-0 flex-col rounded-md border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black py-2 pl-2 pr-2.5 shadow-lg ring-1 ring-black/40">
            <div className="shrink-0 pr-1 text-[9px] font-bold uppercase tracking-widest text-amber-200/80">
              Master
            </div>
            <div className="mt-2 flex min-h-0 min-w-[260px] max-w-[420px] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden border-t border-white/10 pt-2 pr-0.5">
              <div className="flex shrink-0 items-end justify-center gap-2 border-b border-white/10 pb-2">
                <span className="pb-2 text-[7px] font-bold text-zinc-600">L</span>
                <LedMeter
                  peak={masterStereo.l.peak}
                  rms={masterStereo.l.rms}
                  className="h-20 max-w-[18px]"
                />
                <span className="pb-2 text-[7px] font-bold text-zinc-600">R</span>
                <LedMeter
                  peak={masterStereo.r.peak}
                  rms={masterStereo.r.rms}
                  className="h-20 max-w-[18px]"
                />
              </div>

              <div className="shrink-0 rounded-md border border-amber-500/35 bg-black/25 p-2 ring-1 ring-amber-400/20">
                <div className="mb-1.5 text-[8px] font-bold uppercase tracking-wide text-amber-200/95">
                  Monitoring
                </div>
                <div className="flex flex-wrap gap-1">
                  <GlowBtn
                    active={monitor === 'near'}
                    onClick={() => {
                      setMonitor('near');
                      setMonitorModalOpen(true);
                    }}
                    ariaLabel="Near field monitors"
                  >
                    Near field
                  </GlowBtn>
                  <GlowBtn
                    active={monitor === 'far'}
                    onClick={() => {
                      setMonitor('far');
                      setMonitorModalOpen(true);
                    }}
                    ariaLabel="Far field monitors"
                  >
                    Far field
                  </GlowBtn>
                </div>
              </div>

              <div className="shrink-0 border-b border-white/10 pb-2">
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

              <div className="shrink-0 border-b border-white/10 pb-2">
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

              <div className="mt-auto flex min-h-0 flex-col gap-2 border-t border-white/10 pt-2">
                <div className="text-[8px] font-bold uppercase text-zinc-500">Groups</div>
                <div className="flex min-h-0 items-end justify-between gap-2 pb-1">
                  <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((s) => (
                      <div key={s} className="rounded border border-white/10 bg-black/35 p-1">
                        <div className="text-center text-[7px] font-bold text-zinc-500">G{s + 1}</div>
                        <div className="mt-0.5 flex justify-center gap-0.5">
                          <HiFiKnob
                            compact
                            label="HF"
                            sublabel="Hz"
                            value={subEqHighFreq[s]!}
                            min={1500}
                            max={16000}
                            tone="eq"
                            onChange={(v) =>
                              setSubEqHighFreq((p) => {
                                const n = [...p] as typeof p;
                                n[s] = v;
                                return n;
                              })
                            }
                          />
                          <HiFiKnob
                            compact
                            label="LF"
                            sublabel="Hz"
                            value={subEqLowFreq[s]!}
                            min={30}
                            max={450}
                            tone="eq"
                            onChange={(v) =>
                              setSubEqLowFreq((p) => {
                                const n = [...p] as typeof p;
                                n[s] = v;
                                return n;
                              })
                            }
                          />
                        </div>
                        <div className="mt-0.5 flex justify-center gap-0.5">
                          <HiFiKnob
                            compact
                            label="HF"
                            sublabel="dB"
                            value={subEqHigh[s]!}
                            min={-18}
                            max={18}
                            tone="eq"
                            unityAt={0}
                            onChange={(v) =>
                              setSubEqHigh((p) => {
                                const n = [...p] as typeof p;
                                n[s] = v;
                                return n;
                              })
                            }
                          />
                          <HiFiKnob
                            compact
                            label="LF"
                            sublabel="dB"
                            value={subEqLow[s]!}
                            min={-18}
                            max={18}
                            tone="eq"
                            unityAt={0}
                            onChange={(v) =>
                              setSubEqLow((p) => {
                                const n = [...p] as typeof p;
                                n[s] = v;
                                return n;
                              })
                            }
                          />
                        </div>
                        <div className="mt-0.5 flex justify-center">
                          <HiFiKnob
                            compact
                            label="Pan"
                            value={subPan[s]!}
                            min={-1}
                            max={1}
                            tone="neutral"
                            unityAt={0}
                            onChange={(v) =>
                              setSubPan((p) => {
                                const n = [...p] as typeof p;
                                n[s] = v;
                                return n;
                              })
                            }
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-0.5">
                          <GlowBtn
                            active={subMute[s]!}
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setSubMute((p) => {
                                const n = [...p] as typeof p;
                                n[s] = !n[s];
                                return n;
                              })
                            }
                          >
                            <VolumeX className="h-3 w-3" />
                          </GlowBtn>
                          <GlowBtn
                            active={subSolo[s]!}
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setSubSolo((p) => {
                                const n = [...p] as typeof p;
                                n[s] = !n[s];
                                return n;
                              })
                            }
                          >
                            <Headphones className="h-3 w-3" />
                          </GlowBtn>
                        </div>
                        <div className="mt-1 flex justify-center">
                          <LongThrowFader
                            value={subFaders[s]!}
                            onChange={(v) =>
                              setSubFaders((p) => {
                                const n = [...p] as typeof p;
                                n[s] = v;
                                return n;
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1 self-stretch pb-1">
                    <GlowBtn active={masterMute} onClick={() => setMasterMute((m) => !m)}>
                      Mute
                    </GlowBtn>
                    <LongThrowFader
                      value={masterFader}
                      onChange={setMasterFader}
                      accent="red"
                      heightClass="h-40"
                      className="mb-2"
                    />
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
