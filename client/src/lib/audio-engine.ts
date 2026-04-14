/**
 * Audio Engine - Web Audio API signal processing for the signal flow simulator.
 * Handles tone generation, gain staging, clipping simulation, and metering.
 */

export interface AudioEngineState {
  isRunning: boolean;
  masterLevel: number;
  isClipping: boolean;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private clipper: WaveShaperNode | null = null;
  private outputGate: GainNode | null = null;
  private gainNodes: Map<string, GainNode> = new Map();
  private filterNodes: Map<string, BiquadFilterNode> = new Map();
  private listeners: Set<(state: AudioEngineState) => void> = new Set();
  private animFrameId: number | null = null;
  private _isRunning = false;

  get isRunning() { return this._isRunning; }
  get audioContext() { return this.ctx; }
  get analyserNode() { return this.analyser; }

  async start(): Promise<void> {
    if (this._isRunning) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create oscillator for tone generation
    this.oscillator = this.ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 1000;

    // Create noise buffer
    const bufferSize = 2 * this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0) as Float32Array;
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;

    // Master chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    // Clipper (waveshaper for saturation simulation)
    this.clipper = this.ctx.createWaveShaper();
    this.clipper.curve = this.makeClipCurve(50) as any;

    // Analyser for metering
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Output gate (mute until signal path is complete)
    this.outputGate = this.ctx.createGain();
    this.outputGate.gain.value = 0;

    // Connect: osc -> masterGain -> clipper -> analyser -> outputGate -> destination
    this.oscillator.connect(this.masterGain);
    this.noiseSource.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.masterGain.connect(this.clipper);
    this.clipper.connect(this.analyser);
    this.analyser.connect(this.outputGate);
    this.outputGate.connect(this.ctx.destination);

    this.oscillator.start();
    this.noiseSource.start();
    this._isRunning = true;

    this.startMetering();
    this.notifyListeners();
  }

  stop(): void {
    if (!this._isRunning || !this.ctx) return;

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.oscillator?.stop();
    this.noiseSource?.stop();
    this.ctx.close();
    this.ctx = null;
    this._isRunning = false;
    this.gainNodes.clear();
    this.filterNodes.clear();
    this.notifyListeners();
  }

  /** Set oscillator waveform */
  setWaveform(type: OscillatorType): void {
    if (this.oscillator) {
      this.oscillator.type = type;
    }
  }

  /** Set oscillator frequency */
  setFrequency(freq: number): void {
    if (this.oscillator && this.ctx) {
      this.oscillator.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
  }

  /** Set master gain (0-1) */
  setMasterGain(value: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.03);
    }
  }

  /** Enable/disable noise */
  setNoiseLevel(value: number): void {
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
    }
  }

  /** Set output gate (0 = muted, 1 = active) */
  setOutputGate(value: number): void {
    if (this.outputGate && this.ctx) {
      this.outputGate.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
    }
  }

  /** Get or create a named gain node */
  getGainNode(name: string): GainNode | null {
    if (!this.ctx) return null;
    if (!this.gainNodes.has(name)) {
      const node = this.ctx.createGain();
      this.gainNodes.set(name, node);
    }
    return this.gainNodes.get(name) || null;
  }

  /** Get current RMS level (0-1) */
  getRMSLevel(): number {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /** Get current peak level (0-1) */
  getPeakLevel(): number {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
  }

  /** Get time domain data for oscilloscope */
  getTimeDomainData(): Float32Array {
    if (!this.analyser) return new Float32Array(0);
    const data = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(data);
    return data;
  }

  /** Get frequency data for spectrum */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /** Subscribe to state changes */
  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private makeClipCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  private startMetering(): void {
    const meter = () => {
      this.animFrameId = requestAnimationFrame(meter);
      const rms = this.getRMSLevel();
      const peak = this.getPeakLevel();
      this.notifyListeners({
        isRunning: true,
        masterLevel: rms,
        isClipping: peak > 0.95,
      });
    };
    meter();
  }

  private notifyListeners(state?: AudioEngineState): void {
    const s = state || {
      isRunning: this._isRunning,
      masterLevel: 0,
      isClipping: false,
    };
    this.listeners.forEach(l => l(s));
  }
}

/** Singleton audio engine instance */
export const audioEngine = new AudioEngine();
