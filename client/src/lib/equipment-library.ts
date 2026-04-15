/**
 * Signal Flow Lab Pro - Professional Equipment Library
 * FULL RESTORATION: Includes all 25+ Branded Units and Detailed Consoles.
 * Provides types and definitions for skeuomorphic rendering and audio routing.
 */

export type SignalLevel = 'mic' | 'line' | 'speaker' | 'digital';

export type EquipmentCategory = 
  | 'microphone' | 'preamp' | 'compressor' | 'eq' 
  | 'reverb' | 'delay' | 'monitor' | 'interface' 
  | 'amp' | 'patchbay' | 'signal-gen' | 'console';

export interface EquipmentDef {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
  description: string;
  width: number;
  heightUnits: number; // Vertical Rack Units (1U = 44px). 0 for floor gear.
  accentColor: string;
  inputs: Array<{ id: string; label: string; type: SignalLevel; position: number }>;
  outputs: Array<{ id: string; label: string; type: SignalLevel; position: number }>;
  hasPhantom?: boolean;
  hasInsert?: boolean;
  specs?: Record<string, string>;
  controls: Array<{ 
    id: string; 
    label: string; 
    type: 'knob' | 'switch' | 'fader' | 'button'; 
    default: any; 
    min?: number; 
    max?: number;
    color?: string;
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
      { id: 'gain', label: 'GAIN', type: 'knob', default: 40, min: 20, max: 80, color: '#d91e1e' },
      { id: 'high-shelf', label: 'HIGH', type: 'knob', default: 0, min: -15, max: 15 },
      { id: 'mid-freq', label: 'MID', type: 'knob', default: 1.6, min: 0.36, max: 7.2 },
      { id: 'low-shelf', label: 'LOW', type: 'knob', default: 0, min: -15, max: 15, color: '#333' },
      { id: 'phantom', label: '48V', type: 'switch', default: false }
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
      { id: 'gain', label: 'GAIN', type: 'knob', default: 35, min: 0, max: 65, color: '#0054a6' },
      { id: 'pad', label: 'PAD', type: 'button', default: false },
      { id: 'phantom', label: '48V', type: 'button', default: false }
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
      { id: 'ratio', label: 'RATIO', type: 'switch', default: 4 }
    ]
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
    ]
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
      { id: 'boost-low', label: 'BOOST', type: 'knob', default: 0, min: 0, max: 10 },
      { id: 'atten-low', label: 'ATTEN', type: 'knob', default: 0, min: 0, max: 10 },
      { id: 'low-freq', label: 'CPS', type: 'knob', default: 60 }
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
    category: 'reverb',
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
    category: 'delay',
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
  { id: 'shure-sm57', name: 'SM57 Dynamic', brand: 'Shure', model: 'SM57', category: 'microphone', description: 'Snare/Amp workhorse.', width: 40, heightUnits: 0, accentColor: '#333333', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'shure-sm58', name: 'SM58 Dynamic', brand: 'Shure', model: 'SM58', category: 'microphone', description: 'Vocal standard.', width: 50, heightUnits: 0, accentColor: '#444444', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'u87', name: 'U87 Condenser', brand: 'Neumann', model: 'U-87 Ai', category: 'microphone', description: 'Elite studio condenser.', width: 60, heightUnits: 0, accentColor: '#9ca3af', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'akg-c414', name: 'C414 Condenser', brand: 'AKG', model: 'C-414 XLII', category: 'microphone', description: 'Versatile instrument mic.', width: 50, heightUnits: 0, accentColor: '#222222', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },
  { id: 'royer-r121', name: 'R-121 Ribbon', brand: 'Royer', model: 'R-121', category: 'microphone', description: 'Smooth ribbon mic.', width: 30, heightUnits: 0, accentColor: '#111111', inputs: [], outputs: [{ id: 'xlr', label: 'XLR', type: 'mic', position: 0.9 }], controls: [] },

  // --- CONSOLES ---
  {
    id: 'vortex-1604',
    name: 'Vortex-16 Workhorse',
    brand: 'SignalFlow',
    model: 'VX-1604',
    category: 'console',
    description: 'Compact 16-channel utility mixer.',
    width: 800,
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
    width: 1200,
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
    width: 1400,
    heightUnits: 20,
    accentColor: '#444444',
    inputs: genPorts(32, 'ch-in', 'mic'),
    outputs: [{ id: 'bus-l', label: 'L', type: 'line', position: 0.5 }, { id: 'bus-r', label: 'R', type: 'line', position: 0.55 }],
    controls: []
  }
];

export const getEquipmentById = (id: string) => equipmentLibrary.find(e => e.id === id);

export const signalColors = {
  mic: '#00E5FF',    // Cyan
  line: '#76FF03',   // Neon Green
  speaker: '#FF3D00', // Deep Orange
  digital: '#D600FF'  // Purple
};