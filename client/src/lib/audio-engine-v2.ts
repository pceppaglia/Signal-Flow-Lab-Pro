/**
 * Audio Engine v2 - Refactored Web Audio API with proper node lifecycle management
 * Supports multiple signal sources, master bus routing, aux returns, and proper cleanup
 */

export interface AudioNodeInstance {
  id: string;
  oscillator?: OscillatorNode;
  bufferSource?: AudioBufferSourceNode;
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  analyser?: AnalyserNode;
}

export interface AudioEngineState {
  isRunning: boolean;
  masterLevel: number;
  isClipping: boolean;
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

  async start(): Promise<void> {
    if (this._isRunning) {
      if (this.ctx?.state === 'suspended') await this.ctx.resume();
      return;
    }

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create master chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    // Clipper (waveshaper for saturation simulation)
    this.clipper = this.ctx.createWaveShaper();
    this.clipper.curve = this.makeClipCurve(50) as any;

    // Master analyser for metering
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    // Output gate (Open by default now)
    this.outputGate = this.ctx.createGain();
    this.outputGate.gain.value = 1.0;

    // Create aux busses (4 aux sends)
    for (let i = 1; i <= 4; i++) {
      const auxBus = this.ctx.createGain();
      auxBus.gain.value = 0;
      this.auxBusses.set(`aux${i}`, auxBus);

      const auxReturn = this.ctx.createGain();
      auxReturn.gain.value = 0;
      this.auxReturns.set(`aux${i}`, auxReturn);

      // Connect aux return to master
      auxReturn.connect(this.masterGain);
    }

    // Create noise buffer for noise generation
    const bufferSize = 2 * this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0) as Float32Array;
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Connect master chain: masterGain -> clipper -> analyser -> outputGate -> destination
    this.masterGain.connect(this.clipper!);
    this.clipper!.connect(this.masterAnalyser!);
    this.masterAnalyser!.connect(this.outputGate!);
    this.outputGate!.connect(this.ctx.destination);

    this._isRunning = true;
    this.startMetering();
    this.notifyListeners();
  }

  stop(): void {
    if (!this._isRunning || !this.ctx) return;

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Stop all registered nodes
    this.nodeRegistry.forEach((node) => {
      this.disconnectNode(node.id);
    });

    this.nodeRegistry.clear();
    this.auxBusses.clear();
    this.auxReturns.clear();

    try {
      this.ctx.close();
    } catch (e) {
      console.warn('Error closing audio context:', e);
    }

    this.ctx = null;
    this._isRunning = false;
    this.notifyListeners();
  }

  /**
   * Create a signal source node (oscillator or noise)
   */
  createSourceNode(nodeId: string, type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'): AudioNodeInstance | null {
    if (!this.ctx) return null;
    if (this.nodeRegistry.has(nodeId)) {
      this.disconnectNode(nodeId);
    }

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.1;

    const instance: AudioNodeInstance = {
      id: nodeId,
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

    // Connect to master
    gainNode.connect(this.masterGain!);

    this.nodeRegistry.set(nodeId, instance);
    return instance;
  }

  /**
   * Disconnect and remove a node from the audio graph
   */
  disconnectNode(nodeId: string): void {
    const node = this.nodeRegistry.get(nodeId);
    if (!node) return;

    try {
      if (node.oscillator) {
        node.oscillator.stop();
        node.oscillator.disconnect();
      }
      if (node.bufferSource) {
        node.bufferSource.stop();
        node.bufferSource.disconnect();
      }
      node.gainNode.disconnect();
      if (node.filterNode) {
        node.filterNode.disconnect();
      }
      if (node.analyser) {
        node.analyser.disconnect();
      }
    } catch (e) {
      console.warn(`Error disconnecting node ${nodeId}:`, e);
    }

    this.nodeRegistry.delete(nodeId);
  }

  /**
   * Bridge to connect two audio nodes in the registry
   */
  connectNodes(fromId: string, toId: string) {
    const fromNode = this.nodeRegistry.get(fromId);
    const toNode = this.nodeRegistry.get(toId);
    
    if (fromNode && toNode && this.ctx) {
      fromNode.gainNode.connect(toNode.gainNode);
    }
  }

  /**
   * Set oscillator frequency for a source node
   */
  setFrequency(nodeId: string, freq: number): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node?.oscillator && this.ctx) {
      node.oscillator.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Set waveform for a source node
   */
  setWaveform(nodeId: string, type: OscillatorType): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node?.oscillator) {
      node.oscillator.type = type;
    }
  }

  /**
   * Set gain for a specific node
   */
  setNodeGain(nodeId: string, value: number): void {
    const node = this.nodeRegistry.get(nodeId);
    if (node && this.ctx) {
      node.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Set master gain (0-1)
   */
  setMasterGain(value: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.ctx.currentTime, 0.03);
    }
  }

  /**
   * Set output gate (0 = muted, 1 = active)
   */
  setOutputGate(value: number): void {
    if (this.outputGate && this.ctx) {
      this.outputGate.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Set aux send level
   */
  setAuxSendLevel(auxId: string, value: number): void {
    const auxBus = this.auxBusses.get(auxId);
    if (auxBus && this.ctx) {
      auxBus.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Set aux return level
   */
  setAuxReturnLevel(auxId: string, value: number): void {
    const auxReturn = this.auxReturns.get(auxId);
    if (auxReturn && this.ctx) {
      auxReturn.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Get current RMS level (0-1)
   */
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

  /**
   * Get current peak level (0-1)
   */
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

  /**
   * Get time domain data for oscilloscope
   */
  getTimeDomainData(): Float32Array {
    if (!this.masterAnalyser) return new Float32Array(0);
    const data = new Float32Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getFloatTimeDomainData(data);
    return data;
  }

  /**
   * Get frequency data for spectrum analyser
   */
  getFrequencyData(): Uint8Array {
    if (!this.masterAnalyser) return new Uint8Array(0);
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state: AudioEngineState = {
      isRunning: this._isRunning,
      masterLevel: this.masterGain?.gain.value ?? 0,
      isClipping: this.getPeakLevel() > 0.95,
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