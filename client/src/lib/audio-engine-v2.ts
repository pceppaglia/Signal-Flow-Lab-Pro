/**
 * Audio Engine v2 - Signal Flow Lab Pro (v3.0)
 * COMPLETE SYSTEM: Restores all DSP functionality, metering, and waveforms.
 * FIXES: Resolves 'suspended' context blocker and 'silent' output gate.
 * ADDS: Support for modular hardware patching (Input/Output Nodes).
 */
import { equipmentLibrary } from './equipment-library';
import {
  FoundationalMixerRuntime,
  FOUNDATIONAL_MIXER_CH_PREFIX,
} from './foundational-mixer-graph';

export interface AudioNodeInstance {
  id: string;
  inputNode: GainNode;      // Modular Patch Input Point
  outputNode: GainNode;     // Modular Patch Output Point
  oscillator?: OscillatorNode;
  bufferSource?: AudioBufferSourceNode;
  oscMixNode?: GainNode;
  noiseMixNode?: GainNode;
  saturator?: WaveShaperNode;
  gainNode: GainNode;       // Equipment Internal Gain Control
  filterNode?: BiquadFilterNode;
  analyser?: AnalyserNode;
}

export interface AudioEngineState {
  isRunning: boolean;
  masterLevel: number;
  isClipping: boolean;
  ctxState: AudioContextState;
}

class AudioEngineV2 {
  private static instance: AudioEngineV2 | null = null;
  private ctx: AudioContext | null = null;
  private nodeRegistry: Map<string, AudioNodeInstance> = new Map();
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private clipper: WaveShaperNode | null = null;
  private outputGate: GainNode | null = null;
  private auxBusses: Map<string, GainNode> = new Map();
  private auxReturns: Map<string, GainNode> = new Map();
  private listeners: Set<(state: AudioEngineState) => void> = new Set();
  private animFrameId: number | null = null;
  private _isRunning = false;
  private noiseBuffer: AudioBuffer | null = null;
  private nodeProfiles: Map<
    string,
    { defId: string; state: Record<string, unknown> }
  > = new Map();
  private micToPreampLinks: Map<string, Set<string>> = new Map();
  private meterBuffers: Map<string, Float32Array> = new Map();
  private autoResumeBound = false;
  private foundationalMixer: FoundationalMixerRuntime | null = null;

  get isRunning() { return this._isRunning; }
  get audioContext() { return this.ctx; }
  get analyserNode() { return this.masterAnalyser; }

  static getInstance(): AudioEngineV2 {
    if (!AudioEngineV2.instance) {
      AudioEngineV2.instance = new AudioEngineV2();
    }
    AudioEngineV2.instance.bindAutoResumeOnFirstGesture();
    return AudioEngineV2.instance;
  }

  /** Last gain stage before `AudioContext.destination` — use as the single master bus output tap. */
  get masterOutput(): GainNode | null {
    return this.outputGate;
  }

  /**
   * Initializes the Audio Engine lifecycle.
   * Ensures the context is resumed and the master gate is open for audible signal.
   */
  async start(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
    }
    this.bindAutoResumeOnFirstGesture();

    // Always attempt resume: running contexts no-op; suspended contexts need an explicit resume
    // (often after tab backgrounding or after suspendOutputWithRampDown).
    try {
      await this.ctx.resume();
    } catch (e) {
      console.warn('AudioContext.resume failed:', e);
    }

    this.ensureMasterChain();
    this.connectMasterOutputToDestination();
    this.ensureFoundationalMixer();

    if (this._isRunning && this.ctx.state === 'running') {
      return;
    }

    // Setup High-Fidelity Noise Buffer for Microphone Emulation
    if (!this.noiseBuffer) {
      const bufferSize = 2 * this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const outputData = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        outputData[i] = Math.random() * 2 - 1;
      }
    }

    this._isRunning = true;
    this.startMetering();
    this.notifyListeners();
  }

  /**
   * Shuts down the engine and cleans up all Web Audio nodes.
   */
  stop(): void {
    if (!this._isRunning || !this.ctx) return;
    
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    // Stop and Disconnect all registered hardware nodes
    this.nodeRegistry.forEach((node) => {
      this.disconnectNode(node.id);
    });

    this.nodeRegistry.clear();
    this.nodeProfiles.clear();
    this.meterBuffers.clear();
    this.micToPreampLinks.clear();
    this.auxBusses.clear();
    this.auxReturns.clear();
    this.foundationalMixer?.dispose();
    this.foundationalMixer = null;

    try {
      this.ctx.close();
    } catch (e) {
      console.warn('AudioContext closure error:', e);
    }

    this.ctx = null;
    this.masterGain = null;
    this.masterAnalyser = null;
    this.clipper = null;
    this.outputGate = null;
    this.foundationalMixer = null;
    this._isRunning = false;
    this.notifyListeners();
  }

  /** Builds docked Foundational Mixer graph + patchable channel inputs (24). */
  ensureFoundationalMixer(): FoundationalMixerRuntime | null {
    if (!this.ctx || !this.masterGain) return null;
    if (this.foundationalMixer) return this.foundationalMixer;

    this.foundationalMixer = new FoundationalMixerRuntime(
      this.ctx,
      this.masterGain,
      this.auxBusses,
      this.auxReturns
    );

    for (let i = 1; i <= 24; i += 1) {
      const ch = this.foundationalMixer.channels[i - 1];
      if (!ch) continue;
      const id = `${FOUNDATIONAL_MIXER_CH_PREFIX}${i}`;
      this.nodeRegistry.set(id, {
        id,
        inputNode: ch.inputGain,
        outputNode: ch.inputGain,
        gainNode: ch.trimGain,
        analyser: ch.meterAnalyser,
      });
      this.registerNodeProfile(id, 'foundational-mixer-channel', {});
    }

    return this.foundationalMixer;
  }

  getFoundationalMixer(): FoundationalMixerRuntime | null {
    return this.foundationalMixer;
  }

  setFoundationalMixerChannelCount(count: number): void {
    this.foundationalMixer?.setActiveChannelCount(count);
  }

  setFoundationalMixerChannelParam(
    channelIndex1: number,
    key: string,
    value: number | boolean | string
  ): void {
    this.foundationalMixer?.setChannelParam(channelIndex1, key, value);
  }

  setFoundationalMixerSubgroupParam(
    subIdx0: number,
    key: string,
    value: number | boolean
  ): void {
    this.foundationalMixer?.setSubgroupParam(subIdx0, key, value);
  }

  setFoundationalMixerMasterParam(
    key: string,
    value: number | boolean | string
  ): void {
    this.foundationalMixer?.setMasterParam(key, value);
  }

  getFoundationalMixerChannelMeter(channelIndex1: number): number {
    return this.foundationalMixer?.getChannelMeter(channelIndex1) ?? 0;
  }

  getFoundationalMixerSubgroupMeter(subIdx0: number): number {
    return this.foundationalMixer?.getSubgroupMeter(subIdx0) ?? 0;
  }

  /** Builds the internal master bus once; idempotent. */
  private ensureMasterChain(): void {
    if (!this.ctx || this.masterGain) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    this.clipper = this.ctx.createWaveShaper();
    this.clipper.curve = this.makeClipCurve(50);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    this.outputGate = this.ctx.createGain();
    this.outputGate.gain.value = 1.0;

    for (let i = 1; i <= 4; i++) {
      const auxBus = this.ctx.createGain();
      auxBus.gain.value = 0;
      this.auxBusses.set(`aux${i}`, auxBus);

      const auxReturn = this.ctx.createGain();
      auxReturn.gain.value = 0;
      this.auxReturns.set(`aux${i}`, auxReturn);

      auxReturn.connect(this.masterGain);
    }

    // masterGain -> clipper -> analyser -> outputGate -> (destination in connectMasterOutputToDestination)
    this.masterGain.connect(this.clipper);
    this.clipper.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.outputGate);
  }

  /** Guarantees the final master stage reaches the hardware output (idempotent; repairs a broken link). */
  private connectMasterOutputToDestination(): void {
    if (!this.ctx || !this.outputGate) return;
    try {
      // Disconnect all outgoing connections, then attach destination once (reliable across browsers).
      this.outputGate.disconnect();
    } catch {
      // ignore
    }
    this.outputGate.connect(this.ctx.destination);
  }

  private bindAutoResumeOnFirstGesture(): void {
    if (this.autoResumeBound || typeof window === 'undefined') return;
    this.autoResumeBound = true;

    const resumeOnGesture = async () => {
      const ctx = this.ctx;
      if (!ctx) {
        try {
          await this.start();
        } catch {
          // Wait for the next gesture if initialization fails.
        }
      } else if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Resume can fail if browser policy still blocks; keep listeners alive.
          return;
        }
      }
      this.connectMasterOutputToDestination();
      window.removeEventListener('click', resumeOnGesture);
      window.removeEventListener('pointerdown', resumeOnGesture);
      window.removeEventListener('keydown', resumeOnGesture);
      window.removeEventListener('touchstart', resumeOnGesture);
    };

    window.addEventListener('click', resumeOnGesture, { passive: true });
    window.addEventListener('pointerdown', resumeOnGesture, { passive: true });
    window.addEventListener('keydown', resumeOnGesture, { passive: true });
    window.addEventListener('touchstart', resumeOnGesture, { passive: true });
  }

  createNode(nodeId: string, defId: string): AudioNodeInstance | null {
    const def = equipmentLibrary.find((d) => d.id === defId);
    if (!def) return null;

    if (defId === 'foundational-mixer-channel') {
      this.ensureFoundationalMixer();
      return this.nodeRegistry.get(nodeId) ?? null;
    }

    if (def.category === 'signal-gen') {
      return this.createSourceNode(nodeId, 'sine');
    }
    if (def.category === 'microphone') {
      return this.createSourceNode(nodeId, 'noise');
    }
    if (def.category === 'source') {
      const source = this.createSourceNode(nodeId, 'sine');
      if (!source) return null;
      const freq =
        defId === 'kick-drum-src'
          ? 60
          : defId === 'vocal-track-src'
            ? 220
            : defId === 'bass-guitar-src'
              ? 110
              : 180;
      this.setFrequency(nodeId, freq);
      this.setNodeGain(nodeId, defId === 'kick-drum-src' ? 0.85 : 0.7);
      return source;
    }
    return this.ensurePatchNode(nodeId, defId);
  }

  /**
   * Creates a Source Node (Oscillator or Noise Generator).
   * Restores all waveform types: sine, square, sawtooth, triangle, noise.
   */
  createSourceNode(nodeId: string, type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'): AudioNodeInstance | null {
    if (!this.ctx || !this.masterGain) return null;

    if (this.nodeRegistry.has(nodeId)) {
      this.disconnectNode(nodeId);
    }

    // Create Hardware Patch Points
    const inputNode = this.ctx.createGain();
    const outputNode = this.ctx.createGain();
    
    // Internal Control Node
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.1;

    const instance: AudioNodeInstance = {
      id: nodeId,
      inputNode,
      outputNode,
      gainNode,
    };

    const oscMixNode = this.ctx.createGain();
    const noiseMixNode = this.ctx.createGain();
    instance.oscMixNode = oscMixNode;
    instance.noiseMixNode = noiseMixNode;

    const oscillator = this.ctx.createOscillator();
    oscillator.type = type === 'noise' ? 'sine' : (type as OscillatorType);
    oscillator.frequency.value = 1000;
    oscillator.connect(oscMixNode);
    oscillator.start();
    instance.oscillator = oscillator;

    const bufferSource = this.ctx.createBufferSource();
    bufferSource.buffer = this.noiseBuffer;
    bufferSource.loop = true;
    bufferSource.connect(noiseMixNode);
    bufferSource.start();
    instance.bufferSource = bufferSource;

    oscMixNode.connect(gainNode);
    noiseMixNode.connect(gainNode);
    this.applySourceBlend(instance, type === 'noise' ? 'noise' : 'osc');

    // Internal Path: [Source] -> gainNode -> outputNode
    gainNode.connect(outputNode);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    outputNode.connect(analyser);
    instance.analyser = analyser;

    // Default Connection: Monitors are connected to master bus by default
    outputNode.connect(this.masterGain);

    this.nodeRegistry.set(nodeId, instance);
    return instance;
  }

  /**
   * Passthrough patch point (e.g. preamp, EQ): input → gain → output → master until repatched.
   */
  ensurePatchNode(nodeId: string, defId?: string): AudioNodeInstance | null {
    if (!this.ctx || !this.masterGain) return null;
    const existing = this.nodeRegistry.get(nodeId);
    if (existing) return existing;

    const inputNode = this.ctx.createGain();
    const outputNode = this.ctx.createGain();
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 1;
    const saturator = this.ctx.createWaveShaper();
    saturator.curve = this.makeClipCurve(28);
    saturator.oversample = '2x';
    inputNode.connect(gainNode);
    const shouldSaturate =
      defId === 'neve-1073' || defId === 'ssl-bus-comp';
    if (shouldSaturate) {
      gainNode.connect(saturator);
      saturator.connect(outputNode);
    } else {
      gainNode.connect(outputNode);
    }
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.65;
    outputNode.connect(analyser);
    outputNode.connect(this.masterGain);

    const instance: AudioNodeInstance = {
      id: nodeId,
      inputNode,
      outputNode,
      gainNode,
      analyser,
      saturator: shouldSaturate ? saturator : undefined,
    };
    this.nodeRegistry.set(nodeId, instance);
    return instance;
  }

  /**
   * Disconnects a node and releases memory.
   * RESTORED: Optional chaining used for clean, safe cleanup.
   */
  disconnectNode(nodeId: string): void {
    if (nodeId.startsWith(FOUNDATIONAL_MIXER_CH_PREFIX)) {
      return;
    }
    const node = this.nodeRegistry.get(nodeId);
    if (!node) return;

    const micsToRefresh: string[] = [];
    this.micToPreampLinks.forEach((preampIds, micId) => {
      if (preampIds.delete(nodeId)) {
        micsToRefresh.push(micId);
      }
    });

    try {
      node.oscillator?.stop();
      node.oscillator?.disconnect();
      node.bufferSource?.stop();
      node.bufferSource?.disconnect();
      node.inputNode.disconnect();
      node.outputNode.disconnect();
      node.gainNode.disconnect();
      node.oscMixNode?.disconnect();
      node.noiseMixNode?.disconnect();
      node.filterNode?.disconnect();
      node.analyser?.disconnect();
    } catch (e) {
      console.warn(`Error during node ${nodeId} disconnection:`, e);
    }
    
    this.nodeRegistry.delete(nodeId);
    this.nodeProfiles.delete(nodeId);
    this.meterBuffers.delete(nodeId);
    this.micToPreampLinks.delete(nodeId);
    this.micToPreampLinks.forEach((preampIds) => preampIds.delete(nodeId));

    micsToRefresh.forEach((id) => this.refreshCondenserPhantomGate(id));
  }

  /**
   * Logical Patching: Physically routes audio from one equipment unit to another.
   * Used by the Cable connection logic.
   */
  connectNodes(
    fromId: string,
    toId: string,
    fromPortId?: string,
    toPortId?: string
  ): void {
    const from = this.nodeRegistry.get(fromId);
    const to = this.nodeRegistry.get(toId);

    if (from && to) {
      // Disconnect from master bus before patching into another hardware unit
      try { 
        from.outputNode.disconnect(this.masterGain!); 
      } catch(e) {
        // Already disconnected or not connected to master
      }
      if (this.canPassConnection(fromId, toId, fromPortId, toPortId)) {
        from.outputNode.connect(to.inputNode);
      } else {
        from.outputNode.connect(this.masterGain!);
      }
      this.trackMicToPreampConnection(fromId, toId);
      this.refreshCondenserPhantomGate(fromId);
    }
  }

  syncConnections(
    links: Array<{
      fromNodeId: string;
      toNodeId: string;
      fromPortId?: string;
      toPortId?: string;
    }>
  ): void {
    if (!this.masterGain) return;
    this.micToPreampLinks.clear();
    const nodeIds = new Set(this.nodeRegistry.keys());

    nodeIds.forEach((id) => {
      const inst = this.nodeRegistry.get(id);
      if (!inst) return;
      try {
        inst.outputNode.disconnect();
      } catch {
        // no-op
      }
      inst.outputNode.connect(this.masterGain!);
      if (inst.analyser) {
        try {
          inst.outputNode.disconnect(inst.analyser);
        } catch {
          // no-op
        }
        inst.outputNode.connect(inst.analyser);
      }
    });

    links.forEach((link) => {
      const from = this.nodeRegistry.get(link.fromNodeId);
      const to = this.nodeRegistry.get(link.toNodeId);
      if (!from || !to) return;
      try {
        from.outputNode.disconnect(this.masterGain!);
      } catch {
        // no-op
      }
      if (this.canPassConnection(link.fromNodeId, link.toNodeId, link.fromPortId, link.toPortId)) {
        from.outputNode.connect(to.inputNode);
      } else {
        from.outputNode.connect(this.masterGain!);
      }
      this.trackMicToPreampConnection(link.fromNodeId, link.toNodeId);
    });

    this.micToPreampLinks.forEach((_, micId) => {
      this.refreshCondenserPhantomGate(micId);
    });
  }

  registerNodeProfile(
    nodeId: string,
    defId: string,
    state: Record<string, unknown> = {}
  ): void {
    this.nodeProfiles.set(nodeId, { defId, state: { ...state } });
  }

  updateNodeState(nodeId: string, key: string, value: unknown): void {
    const profile = this.nodeProfiles.get(nodeId);
    if (!profile) return;
    profile.state = { ...profile.state, [key]: value };
    this.nodeProfiles.set(nodeId, profile);

    if (key === 'phantom' || key === 'phantomPower') {
      this.refreshLinkedMicrophonesForPreamp(nodeId);
    }
  }

  /**
   * Condenser mics into a preamp are muted at the mic gain stage unless +48V is on
   * (dynamic / ribbon mics are unaffected).
   */
  private refreshCondenserPhantomGate(micId: string): void {
    if (!this.isCondenserMic(micId)) {
      this.setNodeGain(micId, 1);
      return;
    }
    const preamps = this.micToPreampLinks.get(micId);
    if (!preamps || preamps.size === 0) {
      this.setNodeGain(micId, 1);
      return;
    }
    let phantomOk = false;
    for (const preId of preamps) {
      const prof = this.nodeProfiles.get(preId);
      if (!prof) continue;
      const def = equipmentLibrary.find((d) => d.id === prof.defId);
      if (def?.category !== 'preamp') continue;
      const on = prof.state.phantomPower === true || prof.state.phantom === true;
      if (on) {
        phantomOk = true;
        break;
      }
    }
    this.setNodeGain(micId, phantomOk ? 1 : 0);
  }

  // --- HARDWARE PARAMETER CONTROLS ---

  setFrequency(nodeId: string, freq: number): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node?.oscillator && this.ctx) {
      node.oscillator.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.008);
    }
  }

  setWaveform(nodeId: string, type: OscillatorType): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node?.oscillator) {
      node.oscillator.type = type;
    }
  }

  setSourceMode(
    nodeId: string,
    mode: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'
  ): void {
    const node = this.nodeRegistry.get(nodeId);
    if (!node?.oscillator) return;
    if (mode === 'noise') {
      this.applySourceBlend(node, 'noise');
      return;
    }
    node.oscillator.type = mode;
    this.applySourceBlend(node, 'osc');
  }

  setNodeGain(nodeId: string, value: number): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node && this.ctx) {
      const safeValue = Math.max(0, Math.min(1, value));
      node.gainNode.gain.setTargetAtTime(safeValue, this.ctx.currentTime, 0.02);
      if (node.saturator) {
        const drive = safeValue > 0.8 ? 48 + (safeValue - 0.8) * 220 : 28;
        node.saturator.curve = this.makeClipCurve(drive);
      }
    }
  }

  setMasterGain(value: number): void {
    if (this.masterGain && this.ctx) {
      const safeValue = Math.max(0, Math.min(1, value));
      this.masterGain.gain.setTargetAtTime(safeValue, this.ctx.currentTime, 0.03);
    }
  }

  /**
   * Ramps master bus to silence then suspends the AudioContext to reduce clicks/pops.
   */
  async suspendOutputWithRampDown(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;

    if (this.masterGain) {
      const t = ctx.currentTime;
      const g = this.masterGain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(0, t, 0.05);
    }

    await new Promise<void>((r) => setTimeout(r, 90));

    if (ctx.state === 'running') {
      await ctx.suspend();
    }
    this.notifyListeners();
  }

  setOutputGate(value: number): void {
    if (this.outputGate && this.ctx) {
      const safeValue = Math.max(0, Math.min(1, value));
      this.outputGate.gain.setTargetAtTime(safeValue, this.ctx.currentTime, 0.05);
    }
  }

  setAuxSendLevel(auxId: string, value: number): void {
    const auxBus = this.auxBusses.get(auxId);
    if (auxBus && this.ctx) {
      const safeValue = Math.max(0, Math.min(1, value));
      auxBus.gain.setTargetAtTime(safeValue, this.ctx.currentTime, 0.02);
    }
  }

  setAuxReturnLevel(auxId: string, value: number): void {
    const auxReturn = this.auxReturns.get(auxId);
    if (auxReturn && this.ctx) {
      const safeValue = Math.max(0, Math.min(1, value));
      auxReturn.gain.setTargetAtTime(safeValue, this.ctx.currentTime, 0.02);
    }
  }

  getMeterLevel(nodeId: string): number {
    if (nodeId.startsWith(FOUNDATIONAL_MIXER_CH_PREFIX)) {
      const n = parseInt(nodeId.slice(FOUNDATIONAL_MIXER_CH_PREFIX.length), 10);
      if (n >= 1 && n <= 24) {
        return this.getFoundationalMixerChannelMeter(n);
      }
    }
    const node = this.nodeRegistry.get(nodeId);
    if (!node?.analyser) return 0;
    const analyser = node.analyser;
    const data = this.meterBuffers.get(nodeId) ?? new Float32Array(analyser.fftSize);
    if (!this.meterBuffers.has(nodeId)) {
      this.meterBuffers.set(nodeId, data);
    }
    analyser.getFloatTimeDomainData(data);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const sample = Math.abs(data[i]);
      if (sample > peak) peak = sample;
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.max(0, Math.min(1, Math.max(peak * 0.8, rms * 1.6)));
  }

  isNodeClipping(nodeId: string): boolean {
    const node = this.nodeRegistry.get(nodeId);
    if (!node?.analyser) return false;
    const analyser = node.analyser;
    const data = this.meterBuffers.get(nodeId) ?? new Float32Array(analyser.fftSize);
    if (!this.meterBuffers.has(nodeId)) {
      this.meterBuffers.set(nodeId, data);
    }
    analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak >= 0.985;
  }

  // --- METERING & DSP DATA ---

  getRMSLevel(): number {
    if (!this.masterAnalyser) return 0;
    const data = new Float32Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getFloatTimeDomainData(data);
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  getPeakLevel(): number {
    if (!this.masterAnalyser) return 0;
    const data = new Float32Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getFloatTimeDomainData(data);
    
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
  }

  getTimeDomainData(): Float32Array {
    if (!this.masterAnalyser) return new Float32Array(0);
    const data = new Float32Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getFloatTimeDomainData(data);
    return data;
  }

  getFrequencyData(): Uint8Array {
    if (!this.masterAnalyser) return new Uint8Array(0);
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(data);
    return data;
  }

  // --- ENGINE STATE & NOTIFICATIONS ---

  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state: AudioEngineState = {
      isRunning: this._isRunning,
      masterLevel: this.masterGain?.gain.value ?? 0,
      isClipping: this.getPeakLevel() > 0.95,
      ctxState: this.ctx?.state ?? 'closed'
    };
    this.listeners.forEach(l => l(state));
  }

  private startMetering(): void {
    const update = () => {
      this.notifyListeners();
      this.animFrameId = requestAnimationFrame(update);
    };
    update();
  }

  /**
   * Soft-clipping algorithm to simulate analog hardware saturation.
   */
  private makeClipCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  private applySourceBlend(
    node: AudioNodeInstance,
    mode: 'osc' | 'noise'
  ): void {
    if (!this.ctx || !node.oscMixNode || !node.noiseMixNode) return;
    const t = this.ctx.currentTime;
    node.oscMixNode.gain.cancelScheduledValues(t);
    node.noiseMixNode.gain.cancelScheduledValues(t);
    node.oscMixNode.gain.setTargetAtTime(mode === 'osc' ? 1 : 0, t, 0.02);
    node.noiseMixNode.gain.setTargetAtTime(mode === 'noise' ? 1 : 0, t, 0.02);
  }

  private trackMicToPreampConnection(fromId: string, toId: string): void {
    const fromProfile = this.nodeProfiles.get(fromId);
    const toProfile = this.nodeProfiles.get(toId);
    if (!fromProfile || !toProfile) return;

    const fromDef = equipmentLibrary.find((def) => def.id === fromProfile.defId);
    const toDef = equipmentLibrary.find((def) => def.id === toProfile.defId);
    if (!fromDef || !toDef) return;
    if (fromDef.category !== 'microphone' || toDef.category !== 'preamp') return;

    const links = this.micToPreampLinks.get(fromId) ?? new Set<string>();
    links.add(toId);
    this.micToPreampLinks.set(fromId, links);
  }

  private canPassConnection(
    fromId: string,
    toId: string,
    fromPortId?: string,
    toPortId?: string
  ): boolean {
    if (!fromPortId || !toPortId) return true;
    const fromProfile = this.nodeProfiles.get(fromId);
    const toProfile = this.nodeProfiles.get(toId);
    if (!fromProfile || !toProfile) return true;
    const fromDef = equipmentLibrary.find((d) => d.id === fromProfile.defId);
    const toDef = equipmentLibrary.find((d) => d.id === toProfile.defId);
    if (!fromDef || !toDef) return true;
    const fromPort = fromDef.outputs.find((p) => p.id === fromPortId);
    const toPort = toDef.inputs.find((p) => p.id === toPortId);
    if (!fromPort || !toPort) return true;
    return true;
  }

  private isCondenserMic(nodeId: string): boolean {
    const profile = this.nodeProfiles.get(nodeId);
    if (!profile) return false;
    const def = equipmentLibrary.find((d) => d.id === profile.defId);
    return (
      def?.category === 'microphone' && def.microphoneType === 'condenser'
    );
  }

  private refreshLinkedMicrophonesForPreamp(preampId: string): void {
    this.micToPreampLinks.forEach((preampIds, micId) => {
      if (preampIds.has(preampId)) {
        this.refreshCondenserPhantomGate(micId);
      }
    });
  }
}

export const audioEngine = AudioEngineV2.getInstance();
