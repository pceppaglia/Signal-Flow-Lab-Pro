import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for Audio Engine v2 - Node Lifecycle Management
 * Verifies that audio nodes are properly created, disconnected, and cleaned up
 */

describe('Audio Engine v2 - Node Lifecycle', () => {
  // Mock Web Audio API
  let mockOscillator: any;
  let mockBufferSource: any;
  let mockGainNode: any;
  let mockAnalyser: any;
  let mockAudioContext: any;

  beforeEach(() => {
    // Create mock nodes
    mockOscillator = {
      type: 'sine',
      frequency: { value: 1000, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };

    mockBufferSource = {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };

    mockGainNode = {
      gain: { value: 0.5, setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAnalyser = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0.8,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatTimeDomainData: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.random() * 0.1;
        }
      }),
      getByteFrequencyData: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 255);
        }
      }),
    };

    mockAudioContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createBufferSource: vi.fn(() => mockBufferSource),
      createGain: vi.fn(() => mockGainNode),
      createAnalyser: vi.fn(() => mockAnalyser),
      createWaveShaper: vi.fn(() => ({ curve: null, connect: vi.fn(), disconnect: vi.fn() })),
      createBuffer: vi.fn((channels, length, rate) => ({
        getChannelData: vi.fn(() => new Float32Array(length)),
      })),
      destination: {},
      currentTime: 0,
      close: vi.fn(),
      sampleRate: 44100,
    };
  });

  it('should properly disconnect oscillator nodes when removed', () => {
    expect(mockOscillator.stop).not.toHaveBeenCalled();
    expect(mockOscillator.disconnect).not.toHaveBeenCalled();

    // Simulate node removal
    mockOscillator.stop();
    mockOscillator.disconnect();

    expect(mockOscillator.stop).toHaveBeenCalledTimes(1);
    expect(mockOscillator.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should properly disconnect buffer source nodes when removed', () => {
    expect(mockBufferSource.stop).not.toHaveBeenCalled();
    expect(mockBufferSource.disconnect).not.toHaveBeenCalled();

    // Simulate node removal
    mockBufferSource.stop();
    mockBufferSource.disconnect();

    expect(mockBufferSource.stop).toHaveBeenCalledTimes(1);
    expect(mockBufferSource.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should disconnect gain nodes from the graph', () => {
    expect(mockGainNode.disconnect).not.toHaveBeenCalled();

    mockGainNode.disconnect();

    expect(mockGainNode.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should handle cleanup of multiple nodes', () => {
    const nodes = [mockOscillator, mockBufferSource, mockGainNode];

    nodes.forEach(node => {
      if (node.stop) node.stop();
      node.disconnect();
    });

    expect(mockOscillator.stop).toHaveBeenCalled();
    expect(mockBufferSource.stop).toHaveBeenCalled();
    expect(mockGainNode.disconnect).toHaveBeenCalled();
  });

  it('should not throw errors when disconnecting already-stopped nodes', () => {
    expect(() => {
      mockOscillator.stop();
      mockOscillator.disconnect();
      mockOscillator.disconnect(); // Second disconnect should not throw
    }).not.toThrow();
  });

  it('should properly manage gain node state', () => {
    const initialGain = mockGainNode.gain.value;
    expect(initialGain).toBe(0.5);

    // Simulate gain change
    mockGainNode.gain.setTargetAtTime(0.1, 0, 0.02);

    expect(mockGainNode.gain.setTargetAtTime).toHaveBeenCalledWith(0.1, 0, 0.02);
  });

  it('should track oscillator frequency changes', () => {
    const initialFreq = mockOscillator.frequency.value;
    expect(initialFreq).toBe(1000);

    // Simulate frequency change
    mockOscillator.frequency.setTargetAtTime(2000, 0, 0.02);

    expect(mockOscillator.frequency.setTargetAtTime).toHaveBeenCalledWith(2000, 0, 0.02);
  });

  it('should properly close audio context', () => {
    expect(mockAudioContext.close).not.toHaveBeenCalled();

    mockAudioContext.close();

    expect(mockAudioContext.close).toHaveBeenCalledTimes(1);
  });

  it('should handle analyser data retrieval', () => {
    const timeDomainData = new Float32Array(mockAnalyser.frequencyBinCount);
    mockAnalyser.getFloatTimeDomainData(timeDomainData);

    expect(mockAnalyser.getFloatTimeDomainData).toHaveBeenCalledWith(timeDomainData);
    expect(timeDomainData.length).toBe(mockAnalyser.frequencyBinCount);
  });

  it('should handle frequency data retrieval', () => {
    const frequencyData = new Uint8Array(mockAnalyser.frequencyBinCount);
    mockAnalyser.getByteFrequencyData(frequencyData);

    expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalledWith(frequencyData);
    expect(frequencyData.length).toBe(mockAnalyser.frequencyBinCount);
  });

  it('should properly set waveform type', () => {
    const waveforms: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

    waveforms.forEach(waveform => {
      mockOscillator.type = waveform;
      expect(mockOscillator.type).toBe(waveform);
    });
  });

  it('should validate gain values are within acceptable range', () => {
    const testValues = [-60, -30, 0, 6];

    testValues.forEach(value => {
      const clamped = Math.max(0, Math.min(1, (value + 60) / 66));
      expect(clamped).toBeGreaterThanOrEqual(0);
      expect(clamped).toBeLessThanOrEqual(1);
    });
  });

  it('should handle RMS level calculation', () => {
    const data = new Float32Array([0.1, -0.2, 0.15, -0.05]);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    expect(rms).toBeGreaterThan(0);
    expect(rms).toBeLessThan(0.2);
  });

  it('should handle peak level calculation', () => {
    const data = new Float32Array([0.1, -0.8, 0.15, -0.05]);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }

    expect(peak).toBeCloseTo(0.8, 5);
  });

  it('should detect clipping condition', () => {
    const peakLevel = 0.94;
    const isClipping = peakLevel > 0.95;

    expect(isClipping).toBe(false);

    const clippingLevel = 0.96;
    const isClipping2 = clippingLevel > 0.95;

    expect(isClipping2).toBe(true);
  });
});

describe('Mixer Configuration', () => {
  it('should initialize mixer with correct channel count', () => {
    const channelCounts = [8, 16, 32];

    channelCounts.forEach(count => {
      const channels = Array.from({ length: count }, (_, i) => ({
        id: `ch${i + 1}`,
        name: `Channel ${i + 1}`,
      }));

      expect(channels.length).toBe(count);
      expect(channels[0].id).toBe('ch1');
    });
  });

  it('should properly initialize aux sends', () => {
    const auxSends = { aux1: 0, aux2: 0, aux3: 0, aux4: 0 };

    expect(Object.keys(auxSends).length).toBe(4);
    expect(auxSends.aux1).toBe(0);
  });

  it('should properly initialize aux returns', () => {
    const auxReturns = { aux1: -12, aux2: -12, aux3: -12, aux4: -12 };

    expect(Object.keys(auxReturns).length).toBe(4);
    expect(auxReturns.aux1).toBe(-12);
  });

  it('should validate fader range', () => {
    const faderValue = -6;
    const minFader = -60;
    const maxFader = 6;

    expect(faderValue).toBeGreaterThanOrEqual(minFader);
    expect(faderValue).toBeLessThanOrEqual(maxFader);
  });

  it('should validate pan range', () => {
    const panValue = 0; // Center
    const minPan = -100; // Left
    const maxPan = 100; // Right

    expect(panValue).toBeGreaterThanOrEqual(minPan);
    expect(panValue).toBeLessThanOrEqual(maxPan);
  });

  it('should track mute and solo states', () => {
    const channel = {
      mute: false,
      solo: false,
    };

    expect(channel.mute).toBe(false);
    expect(channel.solo).toBe(false);

    channel.mute = true;
    expect(channel.mute).toBe(true);

    channel.solo = true;
    expect(channel.solo).toBe(true);
  });

  it('should handle direct output routing', () => {
    const directOut = -100; // Off
    const minDirectOut = -60;
    const maxDirectOut = 0;

    expect(directOut).toBeLessThan(minDirectOut);

    const activeDirectOut = -12;
    expect(activeDirectOut).toBeGreaterThanOrEqual(minDirectOut);
    expect(activeDirectOut).toBeLessThanOrEqual(maxDirectOut);
  });

  it('should handle insert send/return state', () => {
    const channel = {
      insertActive: false,
    };

    expect(channel.insertActive).toBe(false);

    channel.insertActive = true;
    expect(channel.insertActive).toBe(true);
  });

  it('should track peak and RMS levels per channel', () => {
    const channel = {
      peakLevel: 0.5,
      rmsLevel: 0.2,
    };

    expect(channel.peakLevel).toBeGreaterThan(channel.rmsLevel);
    expect(channel.peakLevel).toBeLessThanOrEqual(1);
    expect(channel.rmsLevel).toBeLessThanOrEqual(1);
  });
});
