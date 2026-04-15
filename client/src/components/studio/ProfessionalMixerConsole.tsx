import React, { useCallback, useEffect, useState } from 'react';
import { audioEngine } from '@/lib/audio-engine-v2';
import type { MixerRoute } from '@/lib/foundational-mixer-graph';
import { cn } from '@/lib/utils';

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
    aux: [0, 0, 0, 0],
    auxPre: [true, true, true, true],
    pan: 0,
    mute: false,
    solo: false,
    fader: 0.75,
    route: 'master',
  };
}

function LedMeter({ level }: { level: number }) {
  const segs = 14;
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

function MiniKnob({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex w-11 flex-col items-center gap-0.5">
      <input
        type="range"
        min={min}
        max={max}
        step={(max - min) / 100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-amber-500"
      />
      <span className="text-[7px] font-bold uppercase tracking-tight text-zinc-500">{label}</span>
    </label>
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
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-1 w-full rounded bg-gradient-to-r from-zinc-700/50 to-zinc-800/30 px-1 py-0.5 text-left text-[8px] font-bold uppercase tracking-widest text-zinc-300 hover:from-zinc-600/60"
    >
      {label} {collapsed ? '▸' : '▾'}
    </button>
  );
}

const ProfessionalMixerConsole: React.FC = () => {
  const [channelCount, setChannelCount] = useState(4);
  const [scale, setScale] = useState(1);
  const [meterFrame, setMeterFrame] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<CollapsibleSection, boolean>>({
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

  const toggleSection = useCallback((s: CollapsibleSection) => {
    setCollapsed((prev) => ({ ...prev, [s]: !prev[s] }));
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

  return (
    <div
      className="flex shrink-0 flex-col border-t border-amber-900/30 bg-gradient-to-b from-[#252a32] via-[#1c2026] to-[#14181c] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
            Foundational Mixer
          </span>
          <span className="text-[9px] text-zinc-500">Boutique slate • {channelCount} ch</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] text-zinc-400">
            Scale
            <input
              type="range"
              min={0.72}
              max={1.15}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="h-1 w-20 accent-amber-500"
            />
          </label>
          {channelCount < 24 && (
            <button
              type="button"
              onClick={() => setChannelCount((c) => Math.min(24, c + 1))}
              className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.25)] hover:bg-amber-500/25"
            >
              + Ch
            </button>
          )}
        </div>
      </div>

      <div
        className="flex min-h-[200px] max-h-[min(40vh,380px)] flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          className="flex min-w-max items-stretch gap-1 px-2 py-2"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'bottom left',
          }}
        >
          {chIndices.map((idx) => {
            const ch = channels[idx - 1]!;
            const level =
              meterFrame >= 0 ? audioEngine.getFoundationalMixerChannelMeter(idx) : 0;
            return (
              <div
                key={idx}
                className="flex w-[118px] shrink-0 flex-col rounded-lg border border-white/10 bg-gradient-to-b from-[#3a4149]/40 to-[#1e2228]/90 p-1.5 shadow-inner"
              >
                <div className="mb-1 flex justify-center">
                  <LedMeter level={level} />
                </div>
                <div className="text-center text-[9px] font-bold text-zinc-400">CH {idx}</div>

                <SectionHead
                  label="Input"
                  collapsed={collapsed.input}
                  onToggle={() => toggleSection('input')}
                />
                {!collapsed.input && (
                  <div className="mt-1 space-y-1 border-t border-white/5 pt-1">
                    <MiniKnob
                      label="Gain"
                      value={ch.trim}
                      min={0}
                      max={1.5}
                      onChange={(v) => {
                        applyChannel(idx, { trim: v });
                        audioEngine.setFoundationalMixerChannelParam(idx, 'trim', v);
                      }}
                    />
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
                        onClick={() => {
                          const v = !ch.hpf;
                          applyChannel(idx, { hpf: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'hpf', v);
                        }}
                      >
                        HPF
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
                    <p className="text-[6px] leading-tight text-zinc-600">
                      Insert send/return (patchbay) — routed pre-dynamics internally.
                    </p>
                  </div>
                )}

                <SectionHead
                  label="Dynamics"
                  collapsed={collapsed.dyn}
                  onToggle={() => toggleSection('dyn')}
                />
                {!collapsed.dyn && (
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
                    <MiniKnob
                      label="Thr"
                      value={ch.compThresh}
                      min={-40}
                      max={0}
                      onChange={(v) => {
                        applyChannel(idx, { compThresh: v });
                        audioEngine.setFoundationalMixerChannelParam(idx, 'compThresh', v);
                      }}
                    />
                    <MiniKnob
                      label="Ratio"
                      value={ch.compRatio}
                      min={1}
                      max={12}
                      onChange={(v) => {
                        applyChannel(idx, { compRatio: v });
                        audioEngine.setFoundationalMixerChannelParam(idx, 'compRatio', v);
                      }}
                    />
                  </div>
                )}

                <SectionHead
                  label="EQ"
                  collapsed={collapsed.eq}
                  onToggle={() => toggleSection('eq')}
                />
                {!collapsed.eq && (
                  <div className="mt-1 space-y-1 border-t border-white/5 pt-1">
                    {(
                      [
                        ['Hi', 'eqHigh', ch.eqHigh],
                        ['HiM', 'eqHiMid', ch.eqHiMid],
                        ['LoM', 'eqLoMid', ch.eqLoMid],
                        ['Lo', 'eqLow', ch.eqLow],
                      ] as const
                    ).map(([label, key, val]) => (
                      <MiniKnob
                        key={key}
                        label={label}
                        value={val}
                        min={-12}
                        max={12}
                        onChange={(v) => {
                          applyChannel(idx, { [key]: v } as Partial<ChannelUI>);
                          audioEngine.setFoundationalMixerChannelParam(
                            idx,
                            key,
                            v
                          );
                        }}
                      />
                    ))}
                  </div>
                )}

                <SectionHead
                  label="Aux"
                  collapsed={collapsed.aux}
                  onToggle={() => toggleSection('aux')}
                />
                {!collapsed.aux && (
                  <div className="mt-1 space-y-1 border-t border-white/5 pt-1">
                    {[0, 1, 2, 3].map((a) => (
                      <div key={a} className="flex items-center gap-0.5">
                        <MiniKnob
                          label={`A${a + 1}`}
                          value={ch.aux[a]!}
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
                          className="px-0.5 text-[6px]"
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
                  collapsed={collapsed.fader}
                  onToggle={() => toggleSection('fader')}
                />
                {!collapsed.fader && (
                  <div className="mt-1 flex flex-1 flex-col border-t border-white/5 pt-1">
                    <MiniKnob
                      label="Pan"
                      value={ch.pan}
                      min={-1}
                      max={1}
                      onChange={(v) => {
                        applyChannel(idx, { pan: v });
                        audioEngine.setFoundationalMixerChannelParam(idx, 'pan', v);
                      }}
                    />
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
                    <div className="mx-auto flex h-24 w-8 items-center justify-center rounded bg-black/50 p-px">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={ch.fader}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          applyChannel(idx, { fader: v });
                          audioEngine.setFoundationalMixerChannelParam(idx, 'fader', v);
                        }}
                        className="h-24 w-4 cursor-pointer appearance-none bg-transparent accent-amber-500"
                        style={{ transform: 'rotate(-90deg)', width: '96px', height: '24px' }}
                      />
                    </div>
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

          {/* Master */}
          <div className="sticky right-0 flex w-[200px] shrink-0 flex-col rounded-lg border border-amber-700/30 bg-gradient-to-b from-[#2c323a] to-[#181c22] p-2 shadow-lg">
            <div className="text-[9px] font-bold uppercase tracking-widest text-amber-200/80">
              Master
            </div>
            <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
              <div className="text-[8px] font-bold text-zinc-500">Subgroups</div>
              {(['1–2', '3–4', '5–6', '7–8'] as const).map((label, s) => (
                <div
                  key={label}
                  className="flex items-end gap-2 rounded border border-white/5 bg-black/20 p-1.5"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[7px] font-bold text-zinc-500">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={subFaders[s]!}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSubFaders((p) => {
                          const n = [...p] as typeof p;
                          n[s] = v;
                          return n;
                        });
                      }}
                      className="h-4 w-16 cursor-pointer appearance-none bg-transparent accent-cyan-500"
                      style={{ transform: 'rotate(-90deg)', width: '72px', height: '16px' }}
                    />
                    <MiniKnob
                      label="Pan"
                      value={subPan[s]!}
                      min={-1}
                      max={1}
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
            </div>
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="text-[8px] font-bold text-zinc-500">Aux masters</div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <MiniKnob
                    key={i}
                    label={`Rtn ${i + 1}`}
                    value={auxRet[i]!}
                    min={0}
                    max={1}
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
            <div className="mt-2 flex gap-1 border-t border-white/10 pt-2">
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
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="text-[8px] font-bold text-zinc-500">Bus comp (SSL-style)</div>
              <MiniKnob
                label="Drive"
                value={busDrive}
                min={0}
                max={1}
                onChange={setBusDrive}
              />
            </div>
            <div className="mt-2 flex flex-1 flex-col items-center border-t border-white/10 pt-2">
              <GlowBtn active={masterMute} onClick={() => setMasterMute((m) => !m)}>
                Mute
              </GlowBtn>
              <div className="mt-1 flex h-28 w-10 items-center justify-center">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={masterFader}
                  onChange={(e) => setMasterFader(Number(e.target.value))}
                  className="cursor-pointer appearance-none bg-transparent accent-amber-400"
                  style={{ transform: 'rotate(-90deg)', width: '112px', height: '28px' }}
                />
              </div>
              <span className="text-[7px] text-zinc-500">Stereo master</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMixerConsole;
