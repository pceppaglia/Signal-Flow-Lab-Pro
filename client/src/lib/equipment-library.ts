/**
 * Signal Flow Lab Pro - Professional Equipment Library
 * FULL RESTORATION: Includes all 25+ Branded Units and Detailed Consoles.
 * Provides types and definitions for skeuomorphic rendering and audio routing.
 */

export type SignalLevel = 'mic' | 'line' | 'speaker' | 'digital';

/** Standard faceplate width for rack-mount modules (matches `RACK_WIDTH_PX` bay). */
export const STANDARD_RACK_FACE_WIDTH = 600;

export type EquipmentCategory = 
  | 'source' | 'microphone' | 'preamp' | 'compressor' | 'eq' 
  | 'reverb' | 'delay' | 'effects' | 'monitor' | 'interface' 
  | 'amp' | 'patchbay' | 'signal-gen' | 'console';

export interface EquipmentDef {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
  description: string;
  educationalTip?: string;
  width: number;
  heightUnits: number; // Vertical Rack Units (1U = 44px). 0 for floor gear.
  accentColor: string;
  /** Present when `category === 'microphone'`. */
  microphoneType?: 'dynamic' | 'condenser' | 'ribbon';
  inputs: Array<{ id: string; label: string; type: SignalLevel; position: number }>;
  outputs: Array<{ id: string; label: string; type: SignalLevel; position: number }>;
  hasPhantom?: boolean;
  hasInsert?: boolean;
  specs?: Record<string, string>;
  controls: Array<{ 
    id: string; 
    label: string; 
    type: 'knob' | 'switch' | 'fader' | 'button' | 'select'; 
    default: any; 
    min?: number; 
    max?: number;
    color?: string;
    options?: Array<{ label: string; value: string }>;
    tooltip?: string;
    step?: number;
    unit?: string;
    /** 0–1 horizontal position on the face (inner bay between rack ears when wide). */
    relX?: number;
    /** 0–1 vertical position on the unit (0 = top). */
    relY?: number;
  }>;
}

// Optimization: Helper to generate repetitive ports for mixers and patchbays
const genPorts = (count: number, prefix: string, type: SignalLevel = 'line') => 
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i+1}`,
    label: `${i+1}`,
    type,
    position: (i + 0.5) / count
  }));

export const equipmentLibrary: EquipmentDef[] = [
  {
    id: 'foundational-mixer-channel',
    name: 'Mixer Channel Input',
    brand: 'Foundational',
    model: 'FMIX',
    category: 'interface',
    description:
      'Patch destination for the docked Foundational Mixer (one instance per channel id).',
    width: 40,
    heightUnits: 0,
    accentColor: '#5c6b7a',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [],
    controls: [],
  },
  {
    id: 'kick-drum-src',
    name: 'Live Kick Drum',
    brand: 'SignalFlow',
    model: 'DYNAMICS-1',
    category: 'source',
    description: "Engineer's Note: close-mic kick transients are fast and benefit from clean preamp headroom.",
    educationalTip: "Treat this as a live mic source. Keep preamp gain conservative to preserve punch.",
    width: 200,
    heightUnits: 0,
    accentColor: '#FFD700',
    inputs: [],
    outputs: [{ id: 'out', label: 'XLR', type: 'mic', position: 0.5 }],
    controls: [],
  },
  {
    id: 'vocal-track-src',
    name: 'Studio Vocal Track',
    brand: 'SignalFlow',
    model: 'VOX-1',
    category: 'source',
    description: "Engineer's Note: a pre-recorded vocal source for gain staging and compression drills.",
    educationalTip: 'Use this source to compare serial compressor tone and threshold behavior.',
    width: 200,
    heightUnits: 0,
    accentColor: '#FFD700',
    inputs: [],
    outputs: [{ id: 'out', label: 'XLR', type: 'mic', position: 0.5 }],
    controls: [],
  },
  {
    id: 'bass-guitar-src',
    name: 'Electric Bass (DI)',
    brand: 'SignalFlow',
    model: 'BASS-DI',
    category: 'source',
    description: "Engineer's Note: DI bass is line-level and generally needs less preamp gain than microphones.",
    educationalTip: 'Line-level DI feeds should bypass mic pre gain whenever possible.',
    width: 200,
    heightUnits: 0,
    accentColor: '#FFD700',
    inputs: [],
    outputs: [{ id: 'out', label: 'TS', type: 'line', position: 0.5 }],
    controls: [],
  },
  {
    id: 'sig-gen-pro',
    name: 'Signal Generator Pro',
    brand: 'SignalFlow',
    model: 'SGP-1',
    category: 'signal-gen',
    description: 'Reference tone and noise generator for calibration and test routing.',
    width: 600,
    heightUnits: 1,
    accentColor: '#00a8ff',
    inputs: [],
    outputs: [
      { id: 'line-out-l', label: 'L', type: 'line', position: 0.35 },
      { id: 'line-out-r', label: 'R', type: 'line', position: 0.65 },
    ],
    controls: [
      {
        id: 'frequency',
        label: 'FREQ',
        type: 'knob',
        default: 1000,
        min: 20,
        max: 20000,
        unit: 'Hz',
        relX: 0.22,
        relY: 0.55,
      },
      {
        id: 'level',
        label: 'LEVEL',
        type: 'knob',
        default: -18,
        min: -60,
        max: 0,
        unit: 'dB',
        relX: 0.48,
        relY: 0.55,
      },
      {
        id: 'waveform',
        label: 'WAVE',
        type: 'select',
        default: 'sine',
        options: [
          { label: 'Sine', value: 'sine' },
          { label: 'Square', value: 'square' },
          { label: 'Noise', value: 'noise' },
        ],
        relX: 0.74,
        relY: 0.55,
      },
    ],
  },
  // --- PREAMPS (RACK GEAR) ---
  {
    id: 'neve-1073',
    name: '1073 Preamp & EQ',
    brand: 'Neve',
    model: '1073',
    category: 'preamp',
    description: 'The industry-standard transformer-balanced preamp. Deep, authoritative low end.',
    width: 600,
    heightUnits: 1,
    accentColor: '#d91e1e',
    inputs: [{ id: 'mic-in', label: 'MIC', type: 'mic', position: 0.3 }, { id: 'line-in', label: 'LINE', type: 'line', position: 0.7 }],
    outputs: [{ id: 'line-out', label: 'OUT', type: 'line', position: 0.5 }],
    hasPhantom: true,
    hasInsert: true,
    controls: [
      { id: 'gain', label: 'GAIN', type: 'knob', default: 40, min: 20, max: 80, color: '#d91e1e', relX: 0.09, relY: 0.5 },
      { id: 'high-shelf', label: 'HIGH', type: 'knob', default: 0, min: -15, max: 15, relX: 0.28, relY: 0.5 },
      { id: 'mid-freq', label: 'MID', type: 'knob', default: 1.6, min: 0.36, max: 7.2, relX: 0.44, relY: 0.5 },
      { id: 'low-shelf', label: 'LOW', type: 'knob', default: 0, min: -15, max: 15, color: '#333', relX: 0.6, relY: 0.5 },
      { id: 'phantom', label: '48V', type: 'switch', default: false, relX: 0.88, relY: 0.5 },
    ]
  },
  {
    id: 'api-512c',
    name: '512c Discrete Preamp',
    brand: 'API',
    model: '512c',
    category: 'preamp',
    description: 'American discrete preamp design. Punchy mids and fast transients.',
    width: 600,
    heightUnits: 1,
    accentColor: '#0054a6',
    inputs: [{ id: 'mic-in', label: 'MIC', type: 'mic', position: 0.3 }, { id: 'inst-in', label: 'INST', type: 'line', position: 0.7 }],
    outputs: [{ id: 'line-out', label: 'OUT', type: 'line', position: 0.5 }],
    hasPhantom: true,
    controls: [
      { id: 'gain', label: 'GAIN', type: 'knob', default: 35, min: 0, max: 65, color: '#0054a6', relX: 0.38, relY: 0.64 },
      { id: 'pad', label: 'PAD', type: 'button', default: false, relX: 0.5, relY: 0.64 },
      { id: 'phantom', label: '48V', type: 'button', default: false, relX: 0.62, relY: 0.64 },
    ]
  },
  {
    id: 'ssl-vhd-pre',
    name: 'VHD Clean Preamp',
    brand: 'SSL',
    model: 'VHD-1',
    category: 'preamp',
    description: 'SuperAnalogue SSL circuitry with Variable Harmonic Drive.',
    width: 600,
    heightUnits: 1,
    accentColor: '#666666',
    inputs: [{ id: 'in', label: 'INPUT', type: 'mic', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUTPUT', type: 'line', position: 0.5 }],
    hasPhantom: true,
    controls: [
      { id: 'gain', label: 'DRIVE', type: 'knob', default: 20, min: 0, max: 75 },
      { id: 'vhd', label: 'VHD', type: 'knob', default: 0, min: 0, max: 100 }
    ]
  },

  // --- COMPRESSORS (RACK GEAR) ---
  {
    id: 'urei-1176',
    name: '1176LN FET Limiter',
    brand: 'UREI',
    model: '1176LN',
    category: 'compressor',
    description: 'Fastest FET compressor ever made. Iconic for drums.',
    width: 600,
    heightUnits: 2,
    accentColor: '#111111',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'input', label: 'INPUT', type: 'knob', default: 30, min: 0, max: 100 },
      { id: 'output', label: 'OUTPUT', type: 'knob', default: 24, min: 0, max: 100 },
      { id: 'attack', label: 'ATTACK', type: 'knob', default: 3, min: 1, max: 7 },
      { id: 'release', label: 'RELEASE', type: 'knob', default: 4, min: 1, max: 7 },
      {
        id: 'ratio',
        label: 'RATIO',
        type: 'select',
        default: '4',
        options: [
          { label: '4:1', value: '4' },
          { label: '8:1', value: '8' },
          { label: '12:1', value: '12' },
          { label: '20:1', value: '20' },
        ],
      },
    ]
    ,
    educationalTip: "The 1176 is a FET compressor known for lightning-fast attack. Push input for attitude and use aggressive ratios for drum smash."
  },
  {
    id: 'pk-2a',
    name: 'PK-2A Leveling Amp',
    brand: 'Teletronix',
    model: 'LA-2A',
    category: 'compressor',
    description: 'Legendary tube optical compressor. Smooth, program-dependent leveling.',
    width: 600,
    heightUnits: 3,
    accentColor: '#c0c0c8',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'peak-reduction', label: 'REDUCTION', type: 'knob', default: 50, min: 0, max: 100 },
      { id: 'gain', label: 'GAIN', type: 'knob', default: 40, min: 0, max: 100 },
      { id: 'limit-comp', label: 'LIMIT', type: 'switch', default: false }
    ],
    educationalTip: "LA-2A optical compression is program-dependent and smooth. Peak Reduction sets threshold while Gain restores level."
  },
  {
    id: 'ssl-bus-comp',
    name: 'G-Series Bus Compressor',
    brand: 'SSL',
    model: 'Mix-Glue',
    category: 'compressor',
    description: 'The master bus compressor from the G-Series console.',
    width: 600,
    heightUnits: 1,
    accentColor: '#444444',
    inputs: [{ id: 'in-l', label: 'L', type: 'line', position: 0.3 }, { id: 'in-r', label: 'R', type: 'line', position: 0.7 }],
    outputs: [{ id: 'out-l', label: 'L', type: 'line', position: 0.3 }, { id: 'out-r', label: 'R', type: 'line', position: 0.7 }],
    controls: [
      { id: 'threshold', label: 'THRESHOLD', type: 'knob', default: 0, min: -20, max: 20 },
      { id: 'makeup', label: 'MAKEUP', type: 'knob', default: 0, min: 0, max: 15 },
      { id: 'ratio', label: 'RATIO', type: 'knob', default: 4 }
    ]
  },
  {
    id: 'dbx-160',
    name: '160 VCA Compressor',
    brand: 'dbx',
    model: '160',
    category: 'compressor',
    description: 'Hard-knee VCA compression. Precise and punchy.',
    width: 600,
    heightUnits: 1,
    accentColor: '#000000',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'threshold', label: 'THRESH', type: 'knob', default: -10, min: -40, max: 20 },
      { id: 'compression', label: 'RATIO', type: 'knob', default: 3, min: 1, max: 10 }
    ]
  },

  // --- EQs (RACK GEAR) ---
  {
    id: 'pultec-eqp1a',
    name: 'EQP-1A Program EQ',
    brand: 'Pultec',
    model: 'EQP-1A',
    category: 'eq',
    description: 'Passive tube EQ. Famous for low-end "Pultec trick".',
    width: 600,
    heightUnits: 2,
    accentColor: '#2a303b',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'boost-low', label: 'BOOST LF', type: 'knob', default: 0, min: 0, max: 10 },
      { id: 'atten-low', label: 'ATTEN LF', type: 'knob', default: 0, min: 0, max: 10 },
      { id: 'low-freq', label: 'CPS', type: 'knob', default: 60, min: 20, max: 100 },
      { id: 'boost-high', label: 'BOOST HF', type: 'knob', default: 0, min: 0, max: 10 },
      { id: 'atten-high', label: 'ATTEN HF', type: 'knob', default: 0, min: 0, max: 10 },
      { id: 'high-freq', label: 'KCS', type: 'knob', default: 5, min: 3, max: 16 },
      { id: 'bandwidth', label: 'BW', type: 'knob', default: 5, min: 1, max: 10 },
    ]
  },
  {
    id: 'ssl-e-series-eq',
    name: 'E-Series EQ',
    brand: 'SSL',
    model: '4000-EQ',
    category: 'eq',
    description: 'Surgical yet musical EQ from the classic 4000E console.',
    width: 600,
    heightUnits: 1,
    accentColor: '#333333',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'hf-gain', label: 'HF', type: 'knob', default: 0, min: -15, max: 15 },
      { id: 'lf-gain', label: 'LF', type: 'knob', default: 0, min: -15, max: 15 }
    ]
  },

  // --- EFFECTS (RACK GEAR) ---
  {
    id: 'lexicon-480l',
    name: 'Digital Effects System',
    brand: 'Lexicon',
    model: '480L',
    category: 'effects',
    description: 'Benchmark digital reverb for elite studios.',
    width: 600,
    heightUnits: 4,
    accentColor: '#dddddd',
    inputs: [{ id: 'in-l', label: 'L', type: 'line', position: 0.3 }, { id: 'in-r', label: 'R', type: 'line', position: 0.7 }],
    outputs: [{ id: 'out-l', label: 'L', type: 'line', position: 0.3 }, { id: 'out-r', label: 'R', type: 'line', position: 0.7 }],
    controls: [
      { id: 'size', label: 'SIZE', type: 'knob', default: 4.8, min: 0.5, max: 10 },
      { id: 'predelay', label: 'DELAY', type: 'knob', default: 24, min: 0, max: 120 }
    ]
  },
  {
    id: 'roland-space-echo',
    name: 'RE-201 Tape Delay',
    brand: 'Roland',
    model: 'RE-201',
    category: 'effects',
    description: 'Classic tape echo with spring reverb.',
    width: 600,
    heightUnits: 3,
    accentColor: '#1a4a1a',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'rate', label: 'RATE', type: 'knob', default: 5, min: 1, max: 10 },
      { id: 'intensity', label: 'INTENSITY', type: 'knob', default: 3, min: 0, max: 10 }
    ]
  },

  // --- UTILITIES (RACK GEAR) ---
  {
    id: 'neutrik-patchbay',
    name: 'NYS Patch Panel',
    brand: 'Neutrik',
    model: '48-TRS',
    category: 'patchbay',
    description: 'Standard studio patchbay for flexible routing.',
    width: 600,
    heightUnits: 1,
    accentColor: '#888888',
    inputs: genPorts(24, 'top', 'line'),
    outputs: genPorts(24, 'bot', 'line'),
    controls: []
  },
  {
    id: 'crown-power-amp',
    name: 'Studio Power Amplifier',
    brand: 'Crown',
    model: 'XLi-800',
    category: 'amp',
    description: 'Reliable power for passive studio monitoring.',
    width: 600,
    heightUnits: 2,
    accentColor: '#111111',
    inputs: [{ id: 'in-l', label: 'L', type: 'line', position: 0.3 }, { id: 'in-r', label: 'R', type: 'line', position: 0.7 }],
    outputs: [{ id: 'spk-l', label: 'L', type: 'speaker', position: 0.3 }, { id: 'spk-r', label: 'R', type: 'speaker', position: 0.7 }],
    controls: [
      { id: 'gain-l', label: 'CH1', type: 'knob', default: 0.7 },
      { id: 'gain-r', label: 'CH2', type: 'knob', default: 0.7 },
      { id: 'power', label: 'POWER', type: 'switch', default: false }
    ]
  },
  {
    id: 'ua-interface',
    name: 'Thunderbolt Interface',
    brand: 'Universal Audio',
    model: 'Apollo-x8p',
    category: 'interface',
    description: 'Professional 18x22 interface with Unison preamps.',
    width: 600,
    heightUnits: 1,
    accentColor: '#222222',
    inputs: genPorts(8, 'in', 'mic'),
    outputs: genPorts(8, 'out', 'line'),
    controls: [
      { id: 'monitor', label: 'MONITOR', type: 'knob', default: -18, min: -100, max: 0 }
    ]
  },

  // --- MONITORING (FLOOR GEAR) ---
  {
    id: 'yamaha-monitor',
    name: 'Active Monitor',
    brand: 'Yamaha',
    model: 'HS-8',
    category: 'monitor',
    description: 'Iconic active monitor with white cone.',
    width: 250,
    heightUnits: 0,
    accentColor: '#ffffff',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [],
    controls: [
      { id: 'level', label: 'LEVEL', type: 'knob', default: 0.5 }
    ]
  },
  {
    id: 'grace-design-hp-amp',
    name: 'DAC/HP Amplifier',
    brand: 'Grace Design',
    model: 'm-900',
    category: 'monitor',
    description: 'High-fidelity headphone amplifier.',
    width: 180,
    heightUnits: 0,
    accentColor: '#999999',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'hp-out', label: 'HP', type: 'line', position: 0.8 }],
    controls: [
      { id: 'volume', label: 'VOLUME', type: 'knob', default: -20, min: -99, max: 0 }
    ]
  },

  // --- MICROPHONES ---
  { id: 'shure-sm57', name: 'SM57 Dynamic', brand: 'Shure', model: 'SM57', category: 'microphone', microphoneType: 'dynamic', description: 'Snare/Amp workhorse.', width: 40, heightUnits: 0, accentColor: '#333333', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'shure-sm58', name: 'SM58 Dynamic', brand: 'Shure', model: 'SM58', category: 'microphone', microphoneType: 'dynamic', description: 'Vocal standard.', width: 50, heightUnits: 0, accentColor: '#444444', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'u87', name: 'U87 Condenser', brand: 'Neumann', model: 'U-87 Ai', category: 'microphone', microphoneType: 'condenser', description: 'Elite studio condenser.', width: 60, heightUnits: 0, accentColor: '#9ca3af', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'u87-condenser', name: 'U87 Condenser Mic', brand: 'Neumann', model: 'U87', category: 'microphone', microphoneType: 'condenser', description: 'Studio-standard large diaphragm condenser microphone.', width: 60, heightUnits: 0, accentColor: '#9ca3af', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [], educationalTip: "Requires phantom power from a preamp on mic-level links. Known for forward mids and polished vocal clarity." },
  { id: 'akg-c414', name: 'C414 Condenser', brand: 'AKG', model: 'C-414 XLII', category: 'microphone', microphoneType: 'condenser', description: 'Versatile instrument mic.', width: 50, heightUnits: 0, accentColor: '#222222', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'royer-r121', name: 'R-121 Ribbon', brand: 'Royer', model: 'R-121', category: 'microphone', microphoneType: 'ribbon', description: 'Smooth ribbon mic.', width: 30, heightUnits: 0, accentColor: '#111111', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },

  // --- CONSOLES ---
  {
    id: '1176-peak-limiter',
    name: '1176 Peak Limiter',
    brand: 'Universal Audio',
    model: '1176LN',
    category: 'compressor',
    description: 'Silver-face FET limiter with ultra-fast transient control.',
    width: 600,
    heightUnits: 2,
    accentColor: '#c5c6ca',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'input', label: 'INPUT', type: 'knob', default: 30, min: 0, max: 100 },
      { id: 'output', label: 'OUTPUT', type: 'knob', default: 24, min: 0, max: 100 },
      { id: 'attack', label: 'ATTACK', type: 'knob', default: 3, min: 1, max: 7 },
      { id: 'release', label: 'RELEASE', type: 'knob', default: 4, min: 1, max: 7 },
    ],
    educationalTip: "FET compression reacts quickly and adds edge when driven. Keep output conservative to avoid overloading downstream stages."
  },
  {
    id: 'la-2a-leveling',
    name: 'LA-2A Leveling Amplifier',
    brand: 'Teletronix',
    model: 'LA-2A',
    category: 'compressor',
    description: 'Gray-face optical leveling amp with musical gain reduction.',
    width: 600,
    heightUnits: 3,
    accentColor: '#bdbdc2',
    inputs: [{ id: 'in', label: 'IN', type: 'line', position: 0.5 }],
    outputs: [{ id: 'out', label: 'OUT', type: 'line', position: 0.5 }],
    controls: [
      { id: 'peak-reduction', label: 'REDUCTION', type: 'knob', default: 50, min: 0, max: 100 },
      { id: 'gain', label: 'GAIN', type: 'knob', default: 40, min: 0, max: 100 },
    ],
    educationalTip: "Optical cells respond smoothly to vocals and bass. Pair with a fast FET limiter after it for modern vocal chains."
  },
  {
    id: 'professional-mixer-console',
    name: 'Professional Mixer Console',
    brand: 'SignalFlow',
    model: 'PMC-32',
    category: 'console',
    description:
      'Modular 600mm inline console: 12U rack centerpiece; patch line-level sources to channel inputs and mains to the room.',
    width: 600,
    heightUnits: 12,
    accentColor: '#2d2d2d',
    inputs: [
      { id: 'ch-in-1', label: 'CH1', type: 'line', position: 0.1 },
      { id: 'ch-in-2', label: 'CH2', type: 'line', position: 0.22 },
      { id: 'ch-in-3', label: 'CH3', type: 'line', position: 0.34 },
      { id: 'ch-in-4', label: 'CH4', type: 'line', position: 0.46 },
      { id: 'ch-in-5', label: 'CH5', type: 'line', position: 0.58 },
    ],
    outputs: [
      { id: 'main-out-l', label: 'L', type: 'line', position: 0.74 },
      { id: 'main-out-r', label: 'R', type: 'line', position: 0.86 },
    ],
    controls: [
      { id: 'ch-1-fader', label: 'CH1', type: 'fader', default: 72, min: 0, max: 100 },
      { id: 'ch-1-mute', label: 'M1', type: 'button', default: false },
      { id: 'ch-1-solo', label: 'S1', type: 'button', default: false },
      { id: 'ch-2-fader', label: 'CH2', type: 'fader', default: 70, min: 0, max: 100 },
      { id: 'ch-2-mute', label: 'M2', type: 'button', default: false },
      { id: 'ch-2-solo', label: 'S2', type: 'button', default: false },
      { id: 'ch-3-fader', label: 'CH3', type: 'fader', default: 68, min: 0, max: 100 },
      { id: 'ch-3-mute', label: 'M3', type: 'button', default: false },
      { id: 'ch-3-solo', label: 'S3', type: 'button', default: false },
      { id: 'ch-4-fader', label: 'CH4', type: 'fader', default: 74, min: 0, max: 100 },
      { id: 'ch-4-mute', label: 'M4', type: 'button', default: false },
      { id: 'ch-4-solo', label: 'S4', type: 'button', default: false },
      { id: 'ch-5-fader', label: 'CH5', type: 'fader', default: 66, min: 0, max: 100 },
      { id: 'ch-5-mute', label: 'M5', type: 'button', default: false },
      { id: 'ch-5-solo', label: 'S5', type: 'button', default: false },
      { id: 'master-fader', label: 'MASTER', type: 'fader', default: 70, min: 0, max: 100 },
      { id: 'talkback', label: 'TALK', type: 'button', default: false },
      { id: 'monitor-level', label: 'MON', type: 'knob', default: -20, min: -100, max: 10 },
      { id: 'aux-1-send', label: 'AUX1', type: 'knob', default: 0, min: -24, max: 10 },
      { id: 'aux-2-send', label: 'AUX2', type: 'knob', default: 0, min: -24, max: 10 },
    ],
  },
  {
    id: 'vortex-1604',
    name: 'Vortex-16 Workhorse',
    brand: 'SignalFlow',
    model: 'VX-1604',
    category: 'console',
    description: 'Compact 16-channel utility mixer.',
    width: 600,
    heightUnits: 12,
    accentColor: '#222222',
    inputs: genPorts(16, 'ch-in', 'line'),
    outputs: [{ id: 'main-l', label: 'L', type: 'line', position: 0.45 }, { id: 'main-r', label: 'R', type: 'line', position: 0.55 }],
    controls: [
      { id: 'master-fader', label: 'MASTER', type: 'fader', default: 0, min: -100, max: 10 }
    ]
  },
  {
    id: 'pearl-asp',
    name: 'ASP-8024 Heritage',
    brand: 'Audient',
    model: 'Pearl',
    category: 'console',
    description: 'High-end analog recording console.',
    width: 600,
    heightUnits: 18,
    accentColor: '#3d4449',
    inputs: genPorts(24, 'ch-in', 'mic'),
    outputs: [{ id: 'mix-l', label: 'L', type: 'line', position: 0.48 }, { id: 'mix-r', label: 'R', type: 'line', position: 0.52 }],
    controls: []
  },
  {
    id: 'ssl-4000g',
    name: '4000 G+ Console',
    brand: 'SSL',
    model: '4000-G',
    category: 'console',
    description: 'The definitive rock and pop mixing console.',
    width: 600,
    heightUnits: 20,
    accentColor: '#444444',
    inputs: genPorts(32, 'ch-in', 'mic'),
    outputs: [{ id: 'bus-l', label: 'L', type: 'line', position: 0.5 }, { id: 'bus-r', label: 'R', type: 'line', position: 0.55 }],
    controls: []
  }
];

/** Categorized tabs for Empty Studio v3.0 rack / stage pickers (derived from `category` + rack height). */
export type UiRackTab = 'preamps' | 'dynamics' | 'eq' | 'fx' | 'utilities';
export type UiStageTab = 'microphones' | 'sources';

export const UI_RACK_TAB_ORDER: UiRackTab[] = [
  'preamps',
  'dynamics',
  'eq',
  'fx',
  'utilities',
];

export const UI_RACK_TAB_LABELS: Record<UiRackTab, string> = {
  preamps: 'Preamps',
  dynamics: 'Dynamics',
  eq: 'EQ',
  fx: 'FX',
  utilities: 'Utilities',
};

export const UI_STAGE_TAB_ORDER: UiStageTab[] = ['microphones', 'sources'];

export const UI_STAGE_TAB_LABELS: Record<UiStageTab, string> = {
  microphones: 'Microphones',
  sources: 'Instrument Sources',
};

export function getRackPickerTab(def: EquipmentDef): UiRackTab | null {
  if (def.heightUnits <= 0) return null;
  switch (def.category) {
    case 'preamp':
      return 'preamps';
    case 'compressor':
      return 'dynamics';
    case 'eq':
      return 'eq';
    case 'reverb':
    case 'delay':
    case 'effects':
      return 'fx';
    default:
      return 'utilities';
  }
}

export function isStagePickerItem(def: EquipmentDef): boolean {
  return (
    def.heightUnits === 0 &&
    (def.category === 'microphone' || def.category === 'source')
  );
}

export function getStagePickerTab(def: EquipmentDef): UiStageTab | null {
  if (!isStagePickerItem(def)) return null;
  return def.category === 'microphone' ? 'microphones' : 'sources';
}

equipmentLibrary.forEach((eq) => {
  if (!eq.educationalTip) {
    eq.educationalTip = `${eq.brand} ${eq.model}: focus on gain staging and signal matching across ports for best headroom.`;
  }
});

export const getEquipmentById = (id: string) => equipmentLibrary.find(e => e.id === id);

/** Cable / port coloring by `SignalLevel` (Renderer + UI). */
export const signalColors: Record<SignalLevel, string> = {
  mic: '#00bcd4',
  line: '#2e7d32',
  speaker: '#e65100',
  digital: '#7c4dff',
};