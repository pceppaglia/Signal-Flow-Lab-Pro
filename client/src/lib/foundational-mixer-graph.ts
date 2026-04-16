/**
 * Foundational Mixer — 24 patchable channel strips → program bus → bus processing → master.
 */

export const FOUNDATIONAL_MIXER_CH_PREFIX = 'foundational-mixer-ch-';

export type MixerRoute = 'master' | 'sub12' | 'sub34' | 'sub56' | 'sub78';

export interface MixerChannelDSP {
  index: number;
  inputGain: GainNode;
  micLineGain: GainNode;
  trimGain: GainNode;
  padGain: GainNode;
  polarityGain: GainNode;
  hpf: BiquadFilterNode;
  insertSendGain: GainNode;
  insertReturnGain: GainNode;
  dynamicsIn: GainNode;
  compressor: DynamicsCompressorNode;
  dryGain: GainNode;
  wetGain: GainNode;
  eqHigh: BiquadFilterNode;
  eqHiMid: BiquadFilterNode;
  eqLoMid: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  preFaderTap: GainNode;
  postFaderTap: GainNode;
  auxPreGain: GainNode[];
  auxPostGain: GainNode[];
  auxPrePost: boolean[];
  faderGain: GainNode;
  panner: StereoPannerNode;
  userMuteGain: GainNode;
  soloGain: GainNode;
  splitter: ChannelSplitterNode;
  monoMerge: GainNode;
  routeMaster: GainNode;
  routeSub12: GainNode;
  routeSub34: GainNode;
  routeSub56: GainNode;
  routeSub78: GainNode;
  meterAnalyser: AnalyserNode;
}

export interface SubGroupDSP {
  index: number;
  sum: GainNode;
  faderGain: GainNode;
  panner: StereoPannerNode;
  muteGain: GainNode;
  soloGain: GainNode;
  splitter: ChannelSplitterNode;
  monoOut: GainNode;
  meterAnalyser: AnalyserNode;
}

export class FoundationalMixerRuntime {
  readonly channels: MixerChannelDSP[] = [];
  readonly subGroups: SubGroupDSP[] = [];
  readonly programBus: GainNode;
  readonly busShaper: WaveShaperNode;
  readonly masterFader: GainNode;
  readonly masterMute: GainNode;
  readonly monitorNear: GainNode;
  readonly monitorFar: GainNode;
  readonly monitorMerge: GainNode;
  readonly auxReturnGains: GainNode[] = [];
  private readonly ctx: AudioContext;
  private activeChannelCount = 4;
  private soloCh = new Set<number>();
  private userMuteCh = new Set<number>();

  constructor(
    ctx: AudioContext,
    masterGain: GainNode,
    auxBusses: Map<string, GainNode>,
    auxReturns: Map<string, GainNode>
  ) {
    this.ctx = ctx;
    this.programBus = ctx.createGain();
    this.programBus.gain.value = 1;
    this.busShaper = ctx.createWaveShaper();
    this.busShaper.curve = this.softClipCurve(18);
    this.busShaper.oversample = '2x';
    this.masterFader = ctx.createGain();
    this.masterFader.gain.value = 0.85;
    this.masterMute = ctx.createGain();
    this.masterMute.gain.value = 1;
    this.monitorNear = ctx.createGain();
    this.monitorFar = ctx.createGain();
    this.monitorMerge = ctx.createGain();
    this.monitorNear.gain.value = 1;
    this.monitorFar.gain.value = 0;

    for (let a = 0; a < 4; a += 1) {
      const id = `aux${a + 1}`;
      const ret = auxReturns.get(id);
      const g = ctx.createGain();
      g.gain.value = 0.35;
      this.auxReturnGains.push(g);
      if (ret) {
        try {
          ret.disconnect();
        } catch {
          // not connected
        }
        ret.connect(g);
        g.connect(this.programBus);
      }
    }

    this.programBus.connect(this.busShaper);
    this.busShaper.connect(this.masterFader);
    this.masterFader.connect(this.masterMute);
    this.masterMute.connect(this.monitorNear);
    this.masterMute.connect(this.monitorFar);
    this.monitorNear.connect(this.monitorMerge);
    this.monitorFar.connect(this.monitorMerge);
    this.monitorMerge.connect(masterGain);

    for (let i = 1; i <= 24; i += 1) {
      this.channels.push(this.buildChannel(i, auxBusses));
    }

    for (let s = 0; s < 4; s += 1) {
      this.subGroups.push(this.buildSubgroup(s));
    }

    for (const ch of this.channels) {
      ch.routeMaster.connect(this.programBus);
      ch.routeSub12.connect(this.subGroups[0]!.sum);
      ch.routeSub34.connect(this.subGroups[1]!.sum);
      ch.routeSub56.connect(this.subGroups[2]!.sum);
      ch.routeSub78.connect(this.subGroups[3]!.sum);
    }

    for (const sub of this.subGroups) {
      sub.monoOut.connect(this.programBus);
    }

    this.setActiveChannelCount(4);
  }

  private softClipCurve(amount: number): Float32Array {
    const n = 1024;
    const c = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i += 1) {
      const x = (i * 2) / (n - 1) - 1;
      c[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return c;
  }

  private buildChannel(i: number, auxBusses: Map<string, GainNode>): MixerChannelDSP {
    const ctx = this.ctx;
    const inputGain = ctx.createGain();
    inputGain.gain.value = 1;
    const micLineGain = ctx.createGain();
    micLineGain.gain.value = 100;
    const trimGain = ctx.createGain();
    trimGain.gain.value = 1;
    const padGain = ctx.createGain();
    padGain.gain.value = 1;
    const polarityGain = ctx.createGain();
    polarityGain.gain.value = 1;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 20;
    hpf.Q.value = 0.707;
    const insertSendGain = ctx.createGain();
    insertSendGain.gain.value = 0;
    const insertReturnGain = ctx.createGain();
    insertReturnGain.gain.value = 0;
    const dynamicsIn = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.22;
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0;
    wetGain.gain.value = 1;
    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 10000;
    eqHigh.gain.value = 0;
    const eqHiMid = ctx.createBiquadFilter();
    eqHiMid.type = 'peaking';
    eqHiMid.frequency.value = 2500;
    eqHiMid.Q.value = 1;
    eqHiMid.gain.value = 0;
    const eqLoMid = ctx.createBiquadFilter();
    eqLoMid.type = 'peaking';
    eqLoMid.frequency.value = 400;
    eqLoMid.Q.value = 1;
    eqLoMid.gain.value = 0;
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 120;
    eqLow.gain.value = 0;
    const preFaderTap = ctx.createGain();
    const postFaderTap = ctx.createGain();
    const auxPreGain = [0, 1, 2, 3].map(() => {
      const g = ctx.createGain();
      g.gain.value = 0;
      return g;
    });
    const auxPostGain = [0, 1, 2, 3].map(() => {
      const g = ctx.createGain();
      g.gain.value = 0;
      return g;
    });
    const auxPrePost = [false, false, false, false];
    const faderGain = ctx.createGain();
    faderGain.gain.value = 0.75;
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;
    const userMuteGain = ctx.createGain();
    userMuteGain.gain.value = 1;
    const soloGain = ctx.createGain();
    soloGain.gain.value = 1;
    const splitter = ctx.createChannelSplitter(2);
    const monoMerge = ctx.createGain();
    monoMerge.gain.value = 1;
    const routeMaster = ctx.createGain();
    const routeSub12 = ctx.createGain();
    const routeSub34 = ctx.createGain();
    const routeSub56 = ctx.createGain();
    const routeSub78 = ctx.createGain();
    routeMaster.gain.value = 1;
    routeSub12.gain.value = 0;
    routeSub34.gain.value = 0;
    routeSub56.gain.value = 0;
    routeSub78.gain.value = 0;
    const meterAnalyser = ctx.createAnalyser();
    meterAnalyser.fftSize = 512;
    meterAnalyser.smoothingTimeConstant = 0.65;

    inputGain.connect(micLineGain);
    micLineGain.connect(trimGain);
    trimGain.connect(padGain);
    padGain.connect(polarityGain);
    polarityGain.connect(hpf);
    hpf.connect(dynamicsIn);
    insertReturnGain.connect(dynamicsIn);
    hpf.connect(insertSendGain);
    dynamicsIn.connect(compressor);
    dynamicsIn.connect(dryGain);
    compressor.connect(wetGain);
    dryGain.connect(eqHigh);
    wetGain.connect(eqHigh);
    eqHigh.connect(eqHiMid);
    eqHiMid.connect(eqLoMid);
    eqLoMid.connect(eqLow);
    eqLow.connect(preFaderTap);
    preFaderTap.connect(faderGain);
    faderGain.connect(postFaderTap);
    postFaderTap.connect(panner);
    panner.connect(userMuteGain);
    userMuteGain.connect(soloGain);
    soloGain.connect(splitter);
    splitter.connect(monoMerge, 0, 0);
    splitter.connect(monoMerge, 1, 0);
    monoMerge.connect(routeMaster);
    monoMerge.connect(routeSub12);
    monoMerge.connect(routeSub34);
    monoMerge.connect(routeSub56);
    monoMerge.connect(routeSub78);
    postFaderTap.connect(meterAnalyser);

    for (let a = 0; a < 4; a += 1) {
      const bus = auxBusses.get(`aux${a + 1}`);
      if (bus) {
        auxPreGain[a]!.connect(bus);
        auxPostGain[a]!.connect(bus);
      }
    }
    preFaderTap.connect(auxPreGain[0]!);
    preFaderTap.connect(auxPreGain[1]!);
    preFaderTap.connect(auxPreGain[2]!);
    preFaderTap.connect(auxPreGain[3]!);
    postFaderTap.connect(auxPostGain[0]!);
    postFaderTap.connect(auxPostGain[1]!);
    postFaderTap.connect(auxPostGain[2]!);
    postFaderTap.connect(auxPostGain[3]!);

    return {
      index: i,
      inputGain,
      micLineGain,
      trimGain,
      padGain,
      polarityGain,
      hpf,
      insertSendGain,
      insertReturnGain,
      dynamicsIn,
      compressor,
      dryGain,
      wetGain,
      eqHigh,
      eqHiMid,
      eqLoMid,
      eqLow,
      preFaderTap,
      postFaderTap,
      auxPreGain,
      auxPostGain,
      auxPrePost,
      faderGain,
      panner,
      userMuteGain,
      soloGain,
      splitter,
      monoMerge,
      routeMaster,
      routeSub12,
      routeSub34,
      routeSub56,
      routeSub78,
      meterAnalyser,
    };
  }

  private buildSubgroup(s: number): SubGroupDSP {
    const ctx = this.ctx;
    const sum = ctx.createGain();
    const faderGain = ctx.createGain();
    faderGain.gain.value = 0.85;
    const panner = ctx.createStereoPanner();
    const muteGain = ctx.createGain();
    muteGain.gain.value = 1;
    const soloGain = ctx.createGain();
    soloGain.gain.value = 1;
    const splitter = ctx.createChannelSplitter(2);
    const monoOut = ctx.createGain();
    monoOut.gain.value = 0.5;
    const meterAnalyser = ctx.createAnalyser();
    meterAnalyser.fftSize = 512;

    sum.connect(faderGain);
    faderGain.connect(panner);
    panner.connect(muteGain);
    muteGain.connect(soloGain);
    soloGain.connect(splitter);
    splitter.connect(monoOut, 0, 0);
    splitter.connect(monoOut, 1, 0);
    faderGain.connect(meterAnalyser);

    return {
      index: s,
      sum,
      faderGain,
      panner,
      muteGain,
      soloGain,
      splitter,
      monoOut,
      meterAnalyser,
    };
  }

  setActiveChannelCount(n: number): void {
    const c = Math.max(1, Math.min(24, Math.floor(n)));
    this.activeChannelCount = c;
    const t = this.ctx.currentTime;
    for (let i = 0; i < this.channels.length; i += 1) {
      const ch = this.channels[i]!;
      const active = i < c;
      ch.inputGain.gain.setTargetAtTime(active ? 1 : 0, t, 0.02);
      if (!active) {
        ch.faderGain.gain.setTargetAtTime(0, t, 0.02);
        ch.userMuteGain.gain.setTargetAtTime(0, t, 0.02);
      } else {
        this.refreshChannelMutes(ch.index);
      }
    }
  }

  getActiveChannelCount(): number {
    return this.activeChannelCount;
  }

  private refreshChannelMutes(ch1: number): void {
    const ch = this.channels[ch1 - 1];
    if (!ch) return;
    const t = this.ctx.currentTime;
    const um = this.userMuteCh.has(ch1) ? 0 : 1;
    const anySolo = this.soloCh.size > 0;
    const sv = !anySolo || this.soloCh.has(ch1) ? 1 : 0;
    ch.userMuteGain.gain.setTargetAtTime(um, t, 0.015);
    ch.soloGain.gain.setTargetAtTime(sv, t, 0.015);
  }

  private refreshAllMutes(): void {
    for (let i = 1; i <= this.activeChannelCount; i += 1) {
      this.refreshChannelMutes(i);
    }
  }

  setChannelParam(
    ch1: number,
    key: string,
    value: number | boolean | string
  ): void {
    const ch = this.channels[ch1 - 1];
    if (!ch) return;
    const t = this.ctx.currentTime;
    const set = (g: AudioParam, v: number) => g.setTargetAtTime(v, t, 0.015);

    switch (key) {
      case 'trim':
        set(ch.trimGain.gain, typeof value === 'number' ? Math.max(0, Math.min(2, value)) : 1);
        break;
      case 'micLine':
        if (value === 'mic') {
          set(ch.micLineGain.gain, 100);
        } else {
          set(ch.micLineGain.gain, 1);
        }
        break;
      case 'pad':
        set(ch.padGain.gain, value === true ? 0.316 : 1);
        break;
      case 'polarity':
        set(ch.polarityGain.gain, value === true ? -1 : 1);
        break;
      case 'hpf':
        ch.hpf.frequency.setTargetAtTime(value === true ? 80 : 20, t, 0.02);
        break;
      case 'phantom48':
        break;
      case 'dynBypass':
        set(ch.dryGain.gain, value === true ? 1 : 0);
        set(ch.wetGain.gain, value === true ? 0 : 1);
        break;
      case 'compThresh':
        if (typeof value === 'number') {
          ch.compressor.threshold.setTargetAtTime(Math.max(-60, Math.min(0, value)), t, 0.02);
        }
        break;
      case 'compRatio':
        if (typeof value === 'number') {
          ch.compressor.ratio.setTargetAtTime(Math.max(1, Math.min(20, value)), t, 0.02);
        }
        break;
      case 'eqHigh':
        if (typeof value === 'number') {
          ch.eqHigh.gain.setTargetAtTime(Math.max(-18, Math.min(18, value)), t, 0.02);
        }
        break;
      case 'eqHiMid':
        if (typeof value === 'number') {
          ch.eqHiMid.gain.setTargetAtTime(Math.max(-18, Math.min(18, value)), t, 0.02);
        }
        break;
      case 'eqLoMid':
        if (typeof value === 'number') {
          ch.eqLoMid.gain.setTargetAtTime(Math.max(-18, Math.min(18, value)), t, 0.02);
        }
        break;
      case 'eqLow':
        if (typeof value === 'number') {
          ch.eqLow.gain.setTargetAtTime(Math.max(-18, Math.min(18, value)), t, 0.02);
        }
        break;
      case 'eqHiMidFreq':
        if (typeof value === 'number') {
          ch.eqHiMid.frequency.setTargetAtTime(Math.max(400, Math.min(8000, value)), t, 0.02);
        }
        break;
      case 'eqLoMidFreq':
        if (typeof value === 'number') {
          ch.eqLoMid.frequency.setTargetAtTime(Math.max(100, Math.min(2000, value)), t, 0.02);
        }
        break;
      case 'aux1':
      case 'aux2':
      case 'aux3':
      case 'aux4': {
        const idx = parseInt(key.slice(3), 10) - 1;
        const v = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
        if (ch.auxPrePost[idx]) {
          set(ch.auxPostGain[idx]!.gain, v);
          set(ch.auxPreGain[idx]!.gain, 0);
        } else {
          set(ch.auxPreGain[idx]!.gain, v);
          set(ch.auxPostGain[idx]!.gain, 0);
        }
        break;
      }
      case 'aux1Pre':
      case 'aux2Pre':
      case 'aux3Pre':
      case 'aux4Pre': {
        const idx = parseInt(key.charAt(3) as string, 10) - 1;
        const pre = value === true;
        ch.auxPrePost[idx] = pre;
        const preV = ch.auxPreGain[idx]!.gain.value;
        const postV = ch.auxPostGain[idx]!.gain.value;
        const level = Math.max(preV, postV);
        if (pre) {
          set(ch.auxPreGain[idx]!.gain, level);
          set(ch.auxPostGain[idx]!.gain, 0);
        } else {
          set(ch.auxPostGain[idx]!.gain, level);
          set(ch.auxPreGain[idx]!.gain, 0);
        }
        break;
      }
      case 'pan':
        if (typeof value === 'number') {
          ch.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, value)), t, 0.02);
        }
        break;
      case 'fader':
        if (typeof value === 'number') {
          const norm = Math.max(0, Math.min(1, value));
          set(ch.faderGain.gain, Math.pow(norm, 2.2));
        }
        break;
      case 'mute':
        if (value === true) {
          this.userMuteCh.add(ch1);
        } else {
          this.userMuteCh.delete(ch1);
        }
        this.refreshChannelMutes(ch1);
        break;
      case 'solo':
        if (value === true) {
          this.soloCh.add(ch1);
        } else {
          this.soloCh.delete(ch1);
        }
        this.refreshAllMutes();
        break;
      case 'route': {
        const r = value as MixerRoute;
        set(ch.routeMaster.gain, r === 'master' ? 1 : 0);
        set(ch.routeSub12.gain, r === 'sub12' ? 1 : 0);
        set(ch.routeSub34.gain, r === 'sub34' ? 1 : 0);
        set(ch.routeSub56.gain, r === 'sub56' ? 1 : 0);
        set(ch.routeSub78.gain, r === 'sub78' ? 1 : 0);
        break;
      }
      default:
        break;
    }
  }

  setSubgroupParam(subIdx: number, key: string, value: number | boolean): void {
    const sub = this.subGroups[subIdx];
    if (!sub) return;
    const t = this.ctx.currentTime;
    switch (key) {
      case 'fader':
        if (typeof value === 'number') {
          sub.faderGain.gain.setTargetAtTime(
            Math.pow(Math.max(0, Math.min(1, value)), 2.2),
            t,
            0.02
          );
        }
        break;
      case 'pan':
        if (typeof value === 'number') {
          sub.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, value)), t, 0.02);
        }
        break;
      case 'mute':
        sub.muteGain.gain.setTargetAtTime(value === true ? 0 : 1, t, 0.02);
        break;
      case 'solo':
        sub.soloGain.gain.setTargetAtTime(value === true ? 1 : 0.35, t, 0.02);
        break;
      default:
        break;
    }
  }

  setMasterParam(key: string, value: number | boolean | string): void {
    const t = this.ctx.currentTime;
    switch (key) {
      case 'masterFader':
        if (typeof value === 'number') {
          this.masterFader.gain.setTargetAtTime(
            Math.pow(Math.max(0, Math.min(1, value)), 2.2),
            t,
            0.02
          );
        }
        break;
      case 'masterMute':
        this.masterMute.gain.setTargetAtTime(value === true ? 0 : 1, t, 0.02);
        break;
      case 'busDrive':
        if (typeof value === 'number') {
          const amt = 12 + Math.max(0, Math.min(1, value)) * 36;
          this.busShaper.curve = this.softClipCurve(amt);
        }
        break;
      case 'monitor':
        if (value === 'near') {
          this.monitorNear.gain.setTargetAtTime(1, t, 0.05);
          this.monitorFar.gain.setTargetAtTime(0, t, 0.05);
        } else {
          this.monitorNear.gain.setTargetAtTime(0, t, 0.05);
          this.monitorFar.gain.setTargetAtTime(1, t, 0.05);
        }
        break;
      case 'auxReturn1':
      case 'auxReturn2':
      case 'auxReturn3':
      case 'auxReturn4': {
        const i = parseInt(key.replace('auxReturn', ''), 10) - 1;
        const g = this.auxReturnGains[i];
        if (g && typeof value === 'number') {
          g.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), t, 0.02);
        }
        break;
      }
      default:
        break;
    }
  }

  getChannelMeter(ch1: number): number {
    const ch = this.channels[ch1 - 1];
    if (!ch) return 0;
    const a = ch.meterAnalyser;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i += 1) {
      peak = Math.max(peak, Math.abs(buf[i]!));
    }
    return Math.min(1, peak * 1.25);
  }

  getSubgroupMeter(subIdx: number): number {
    const sub = this.subGroups[subIdx];
    if (!sub) return 0;
    const a = sub.meterAnalyser;
    const buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i += 1) {
      peak = Math.max(peak, Math.abs(buf[i]!));
    }
    return Math.min(1, peak * 1.25);
  }

  dispose(): void {
    try {
      this.programBus.disconnect();
      this.monitorMerge.disconnect();
    } catch {
      // no-op
    }
  }
}
