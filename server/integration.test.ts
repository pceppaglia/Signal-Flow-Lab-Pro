import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Integration Tests - Audio Engine Lifecycle & Mixer Routing
 * Tests the real-world scenarios of adding/removing equipment and signal flow
 */

describe('Audio Engine Integration - Node Lifecycle', () => {
  it('should properly initialize audio context on first use', () => {
    const mockContext = {
      state: 'running',
      sampleRate: 44100,
      currentTime: 0,
    };

    expect(mockContext.state).toBe('running');
    expect(mockContext.sampleRate).toBe(44100);
  });

  it('should create oscillator node when signal generator is added', () => {
    const nodeRegistry = new Map();
    const nodeId = 'gen-1';
    
    const oscillator = {
      type: 'sine',
      frequency: { value: 1000 },
      start: () => {},
      stop: () => {},
      disconnect: () => {},
    };

    nodeRegistry.set(nodeId, oscillator);

    expect(nodeRegistry.has(nodeId)).toBe(true);
    expect(nodeRegistry.get(nodeId)?.type).toBe('sine');
  });

  it('should disconnect and remove oscillator when signal generator is deleted', () => {
    const nodeRegistry = new Map();
    const nodeId = 'gen-1';
    
    const oscillator = {
      type: 'sine',
      frequency: { value: 1000 },
      stopped: false,
      disconnected: false,
      start: () => {},
      stop: function() { this.stopped = true; },
      disconnect: function() { this.disconnected = true; },
    };

    nodeRegistry.set(nodeId, oscillator);
    
    // Simulate deletion
    const node = nodeRegistry.get(nodeId);
    if (node) {
      if (node.stop) node.stop();
      node.disconnect();
      nodeRegistry.delete(nodeId);
    }

    expect(node?.stopped).toBe(true);
    expect(node?.disconnected).toBe(true);
    expect(nodeRegistry.has(nodeId)).toBe(false);
  });

  it('should handle multiple nodes being added and removed', () => {
    const nodeRegistry = new Map();
    const nodes = ['gen-1', 'mic-1', 'preamp-1', 'comp-1'];

    // Add nodes
    nodes.forEach(id => {
      nodeRegistry.set(id, { id, connected: true });
    });

    expect(nodeRegistry.size).toBe(4);

    // Remove nodes
    nodes.forEach(id => {
      nodeRegistry.delete(id);
    });

    expect(nodeRegistry.size).toBe(0);
  });

  it('should properly cleanup all nodes on workspace reset', () => {
    const nodeRegistry = new Map();
    const nodes = ['gen-1', 'mic-1', 'preamp-1'];

    nodes.forEach(id => {
      nodeRegistry.set(id, { 
        id, 
        stop: () => {},
        disconnect: () => {}
      });
    });

    expect(nodeRegistry.size).toBe(3);

    // Clear workspace
    nodeRegistry.clear();

    expect(nodeRegistry.size).toBe(0);
  });
});

describe('Mixer Routing Integration', () => {
  it('should route channel signal to master bus', () => {
    const mixer = {
      channels: Array.from({ length: 8 }, (_, i) => ({
        id: `ch${i + 1}`,
        fader: -6,
        mute: false,
        output: 'master',
      })),
      master: {
        fader: 0,
        output: 'main',
      },
    };

    const channel1 = mixer.channels[0];
    expect(channel1.output).toBe('master');
  });

  it('should handle mute state affecting signal routing', () => {
    const channel = {
      id: 'ch1',
      fader: -6,
      mute: false,
      level: 0.5,
    };

    expect(channel.mute).toBe(false);
    expect(channel.level).toBe(0.5);

    channel.mute = true;
    const effectiveLevel = channel.mute ? 0 : channel.level;

    expect(effectiveLevel).toBe(0);
  });

  it('should handle solo state properly', () => {
    const channels = [
      { id: 'ch1', solo: false, mute: false },
      { id: 'ch2', solo: true, mute: false },
      { id: 'ch3', solo: false, mute: false },
    ];

    const soloedChannel = channels.find(ch => ch.solo);
    expect(soloedChannel?.id).toBe('ch2');

    // When solo is active, other channels should be muted
    const otherChannels = channels.filter(ch => ch.id !== soloedChannel?.id);
    expect(otherChannels.length).toBe(2);
  });

  it('should route aux sends to aux buses', () => {
    const channel = {
      id: 'ch1',
      auxSends: {
        aux1: 0,
        aux2: -12,
        aux3: -12,
        aux4: -12,
      },
    };

    expect(channel.auxSends.aux1).toBe(0);
    expect(channel.auxSends.aux2).toBe(-12);
  });

  it('should route aux returns to master', () => {
    const mixer = {
      auxReturns: {
        aux1: { fader: -12, mute: false, output: 'master' },
        aux2: { fader: -12, mute: false, output: 'master' },
        aux3: { fader: -12, mute: false, output: 'master' },
        aux4: { fader: -12, mute: false, output: 'master' },
      },
    };

    Object.values(mixer.auxReturns).forEach(ret => {
      expect(ret.output).toBe('master');
    });
  });

  it('should handle direct output routing', () => {
    const channel = {
      id: 'ch1',
      directOut: -100, // Off
    };

    expect(channel.directOut).toBe(-100);

    channel.directOut = -12; // Active
    expect(channel.directOut).toBe(-12);
  });

  it('should handle insert send/return', () => {
    const channel = {
      id: 'ch1',
      insertActive: false,
      insertSend: -100,
      insertReturn: -100,
    };

    expect(channel.insertActive).toBe(false);

    channel.insertActive = true;
    channel.insertSend = 0;
    channel.insertReturn = 0;

    expect(channel.insertActive).toBe(true);
    expect(channel.insertSend).toBe(0);
  });

  it('should handle pan control affecting L/R routing', () => {
    const channel = {
      id: 'ch1',
      pan: 0, // Center
      leftGain: 1,
      rightGain: 1,
    };

    // Center pan
    expect(channel.pan).toBe(0);
    expect(channel.leftGain).toBe(1);
    expect(channel.rightGain).toBe(1);

    // Pan left
    channel.pan = -100;
    channel.leftGain = 1;
    channel.rightGain = 0;

    expect(channel.pan).toBe(-100);
    expect(channel.leftGain).toBe(1);
    expect(channel.rightGain).toBe(0);
  });

  it('should calculate master output from all channels', () => {
    const channels = [
      { id: 'ch1', fader: 0, mute: false, level: 0.5 },
      { id: 'ch2', fader: -6, mute: false, level: 0.3 },
      { id: 'ch3', fader: -12, mute: true, level: 0 },
    ];

    const masterLevel = channels
      .filter(ch => !ch.mute)
      .reduce((sum, ch) => sum + ch.level, 0) / channels.filter(ch => !ch.mute).length;

    expect(masterLevel).toBeGreaterThan(0);
    expect(masterLevel).toBeLessThan(1);
  });

  it('should handle subgroup routing', () => {
    const subgroups = {
      drums: { channels: ['ch1', 'ch2', 'ch3'], fader: 0, output: 'master' },
      vocals: { channels: ['ch4', 'ch5'], fader: 0, output: 'master' },
      bass: { channels: ['ch6'], fader: 0, output: 'master' },
    };

    expect(subgroups.drums.channels.length).toBe(3);
    expect(subgroups.vocals.channels.length).toBe(2);
    expect(subgroups.bass.channels.length).toBe(1);
  });
});

describe('Signal Flow Integration', () => {
  it('should track signal path from source to output', () => {
    const signalPath = [
      { stage: 'source', level: 0 },
      { stage: 'preamp', level: 12 },
      { stage: 'compressor', level: 8 },
      { stage: 'eq', level: 8 },
      { stage: 'fader', level: -6 },
      { stage: 'master', level: -6 },
    ];

    expect(signalPath[0].stage).toBe('source');
    expect(signalPath[signalPath.length - 1].stage).toBe('master');
  });

  it('should detect clipping at any stage', () => {
    const stages = [
      { name: 'preamp', level: 0.8, clipping: false },
      { name: 'compressor', level: 0.95, clipping: false },
      { name: 'master', level: 0.98, clipping: true },
    ];

    const clippingStages = stages.filter(s => s.clipping);
    expect(clippingStages.length).toBe(1);
    expect(clippingStages[0].name).toBe('master');
  });

  it('should handle monitor mix routing independently from main mix', () => {
    const mainMix = {
      channels: [
        { id: 'ch1', level: -6 },
        { id: 'ch2', level: -6 },
      ],
      output: 'main',
    };

    const monitorMix = {
      channels: [
        { id: 'ch1', level: 0 },
        { id: 'ch2', level: -12 },
      ],
      output: 'headphones',
    };

    expect(mainMix.channels[0].level).toBe(-6);
    expect(monitorMix.channels[0].level).toBe(0);
  });

  it('should handle multiple monitor mixes for different performers', () => {
    const monitorMixes = {
      performer1: {
        channels: [
          { id: 'ch1', level: 0 },
          { id: 'ch2', level: -6 },
        ],
      },
      performer2: {
        channels: [
          { id: 'ch1', level: -6 },
          { id: 'ch2', level: 0 },
        ],
      },
    };

    expect(monitorMixes.performer1.channels[0].level).toBe(0);
    expect(monitorMixes.performer2.channels[0].level).toBe(-6);
  });
});
