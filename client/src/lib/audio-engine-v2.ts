/**
 * Audio Engine v2 - Signal Flow Lab Pro (v3.0)
 * COMPLETE SYSTEM: Restores all DSP functionality, metering, and waveforms.
 * FIXES: Resolves 'suspended' context blocker and 'silent' output gate.
 * ADDS: Support for modular hardware patching (Input/Output Nodes).
 */

export interface AudioNodeInstance {
  id: string;
  inputNode: GainNode;      // Modular Patch Input Point
  outputNode: GainNode;     // Modular Patch Output Point
  oscillator?: OscillatorNode;
  bufferSource?: AudioBufferSourceNode;
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

  get isRunning() { return this._isRunning; }
  get audioContext() { return this.ctx; }
  get analyserNode() { return this.masterAnalyser; }

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

    // --- BROWSER SECURITY FIX ---
    // Modern browsers require an explicit resume() call triggered by a user event.
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.ensureMasterChain();
    this.connectMasterOutputToDestination();

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
    this.auxBusses.clear();
    this.auxReturns.clear();

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
    this._isRunning = false;
    this.notifyListeners();
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
      this.outputGate.disconnect(this.ctx.destination);
    } catch {
      // not linked to destination
    }
    this.outputGate.connect(this.ctx.destination);
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

    if (type === 'noise') {
      const bufferSource = this.ctx.createBufferSource();
      bufferSource.buffer = this.noiseBuffer;
      bufferSource.loop = true;
      bufferSource.connect(gainNode);
      bufferSource.start();
      instance.bufferSource = bufferSource;
    } else {
      const oscillator = this.ctx.createOscillator();
      oscillator.type = type as OscillatorType;
      oscillator.frequency.value = 1000;
      oscillator.connect(gainNode);
      oscillator.start();
      instance.oscillator = oscillator;
    }

    // Internal Path: [Source] -> gainNode -> outputNode
    gainNode.connect(outputNode);

    // Default Connection: Monitors are connected to master bus by default
    outputNode.connect(this.masterGain);

    this.nodeRegistry.set(nodeId, instance);
    return instance;
  }

  /**
   * Passthrough patch point (e.g. preamp, EQ): input → gain → output → master until repatched.
   */
  ensurePatchNode(nodeId: string): AudioNodeInstance | null {
    if (!this.ctx || !this.masterGain) return null;
    const existing = this.nodeRegistry.get(nodeId);
    if (existing) return existing;

    const inputNode = this.ctx.createGain();
    const outputNode = this.ctx.createGain();
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 1;
    inputNode.connect(gainNode);
    gainNode.connect(outputNode);
    outputNode.connect(this.masterGain);

    const instance: AudioNodeInstance = {
      id: nodeId,
      inputNode,
      outputNode,
      gainNode,
    };
    this.nodeRegistry.set(nodeId, instance);
    return instance;
  }

  /**
   * Disconnects a node and releases memory.
   * RESTORED: Optional chaining used for clean, safe cleanup.
   */
  disconnectNode(nodeId: string): void {
    const node = this.nodeRegistry.get(nodeId);
    if (!node) return;

    try {
      node.oscillator?.stop();
      node.oscillator?.disconnect();
      node.bufferSource?.stop();
      node.bufferSource?.disconnect();
      node.inputNode.disconnect();
      node.outputNode.disconnect();
      node.gainNode.disconnect();
      node.filterNode?.disconnect();
      node.analyser?.disconnect();
    } catch (e) {
      console.warn(`Error during node ${nodeId} disconnection:`, e);
    }
    
    this.nodeRegistry.delete(nodeId);
  }

  /**
   * Logical Patching: Physically routes audio from one equipment unit to another.
   * Used by the Cable connection logic.
   */
  connectNodes(fromId: string, toId: string): void {
    const from = this.nodeRegistry.get(fromId);
    const to = this.nodeRegistry.get(toId);

    if (from && to) {
      // Disconnect from master bus before patching into another hardware unit
      try { 
        from.outputNode.disconnect(this.masterGain!); 
      } catch(e) {
        // Already disconnected or not connected to master
      }
      from.outputNode.connect(to.inputNode);
    }
  }

  // --- HARDWARE PARAMETER CONTROLS ---

  setFrequency(nodeId: string, freq: number): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node?.oscillator && this.ctx) {
      node.oscillator.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
  }

  setWaveform(nodeId: string, type: OscillatorType): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node?.oscillator) {
      node.oscillator.type = type;
    }
  }

  setNodeGain(nodeId: string, value: number): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node && this.ctx) {
      const safeValue = Math.max(0, Math.min(1, value));
      node.gainNode.gain.setTargetAtTime(safeValue, this.ctx.currentTime, 0.02);
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
}

export const audioEngine = new AudioEngineV2();