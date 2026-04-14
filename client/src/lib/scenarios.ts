import type { EquipmentNode } from '../../../shared/equipment-types';

export interface ScenarioDef {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  objectives: { id: string; description: string; hint: string }[];
  initialNodes: EquipmentNode[];
  hints: string[];
  completionMessage: string;
}

export const scenarios: ScenarioDef[] = [
  {
    id: 'basic-signal-path',
    title: 'Basic Signal Path',
    description: 'Learn the fundamental signal flow from microphone to speakers. Connect a dynamic microphone through a preamp, channel strip, and out to monitors.',
    difficulty: 'beginner',
    category: 'Signal Flow Basics',
    objectives: [
      { id: 'connect-mic-pre', description: 'Connect the SM57 microphone to the Neve 1073 preamp mic input', hint: 'Drag from the SM57 XLR output to the 1073 Mic In port. Both are mic-level (green) connections.' },
      { id: 'set-gain', description: 'Set the preamp gain to 40dB', hint: 'Select the 1073 and adjust the Gain knob to 40dB. This brings the mic-level signal up to line level.' },
      { id: 'connect-pre-channel', description: 'Connect the preamp output to the channel strip', hint: 'The preamp outputs line level (amber). Connect it to the channel strip line input.' },
      { id: 'connect-channel-amp', description: 'Route the channel bus output to the power amplifier', hint: 'Connect the channel strip bus output to the power amp input.' },
      { id: 'connect-speakers', description: 'Connect the power amp to both studio monitors', hint: 'Connect the speaker outputs (red) to each monitor. Make sure the amp impedance matches the speakers.' },
      { id: 'power-on', description: 'Turn on the power amplifier', hint: 'Select the power amp and toggle the Power switch ON. Remember: always power on the amp LAST!' },
    ],
    initialNodes: [
      { instanceId: 'sc-sm57', defId: 'sm57', x: 50, y: 200, settings: {}, signalLevels: {} },
      { instanceId: 'sc-1073', defId: 'neve-1073', x: 250, y: 150, settings: { gain: 0, phantom: false, phase: false, pad: false, hpf: false, 'eq-high': 0, 'eq-mid': 0, 'eq-mid-freq': 1600, 'eq-low': 0 }, signalLevels: {} },
      { instanceId: 'sc-ch1', defId: 'ssl-channel', x: 500, y: 80, settings: { fader: 0, pan: 0, aux1: -96, aux2: -96, 'eq-in': true, 'dyn-in': false, mute: false, solo: false }, signalLevels: {} },
      { instanceId: 'sc-amp', defId: 'power-amp', x: 700, y: 200, settings: { power: false, level: -20, impedance: '8' }, signalLevels: {} },
      { instanceId: 'sc-spkL', defId: 'monitor-speaker', x: 950, y: 100, settings: {}, signalLevels: {} },
      { instanceId: 'sc-spkR', defId: 'monitor-speaker', x: 950, y: 320, settings: {}, signalLevels: {} },
    ],
    hints: [
      'Signal flows from left to right: Source → Preamp → Channel → Amp → Speakers',
      'Green ports are mic level, amber ports are line level, red ports are speaker level',
      'You can only connect ports of the same signal level type',
    ],
    completionMessage: 'Excellent! You\'ve completed the basic signal path. You now understand how audio flows from a microphone all the way to the speakers through gain staging.',
  },
  {
    id: 'gain-staging',
    title: 'Proper Gain Staging',
    description: 'Learn to set proper gain at each stage of the signal chain to achieve optimal signal-to-noise ratio without clipping.',
    difficulty: 'beginner',
    category: 'Gain Structure',
    objectives: [
      { id: 'connect-chain', description: 'Build a complete signal chain: Signal Gen → 1073 → 1176 → Channel → Amp → Monitors', hint: 'Connect each piece of equipment in order. Use the signal generator as your source.' },
      { id: 'set-gen-level', description: 'Set the signal generator to -20 dBu (mic level simulation)', hint: 'Select the Signal Generator and set the Level to -20 dBu.' },
      { id: 'optimal-preamp', description: 'Set preamp gain so the output reads around +4 dBu (nominal line level)', hint: 'Adjust the 1073 gain until the output meter shows a healthy level without clipping.' },
      { id: 'gentle-compression', description: 'Apply 3-4 dB of gain reduction on the 1176', hint: 'Adjust the 1176 Input control until you see 3-4 dB of gain reduction. Use the Output knob to make up the lost gain.' },
      { id: 'unity-fader', description: 'Set the channel fader to unity (0 dB)', hint: 'Unity gain means the fader adds no gain or attenuation. This is the standard operating level.' },
    ],
    initialNodes: [
      { instanceId: 'gs-gen', defId: 'signal-gen', x: 50, y: 200, settings: { waveform: 'sine', frequency: 1000, level: -40 }, signalLevels: {} },
      { instanceId: 'gs-1073', defId: 'neve-1073', x: 250, y: 150, settings: { gain: 0, phantom: false, phase: false, pad: false, hpf: false, 'eq-high': 0, 'eq-mid': 0, 'eq-mid-freq': 1600, 'eq-low': 0 }, signalLevels: {} },
      { instanceId: 'gs-1176', defId: 'urei-1176', x: 500, y: 200, settings: { input: 0, output: 50, attack: 4, release: 4, ratio: '4' }, signalLevels: {} },
      { instanceId: 'gs-ch1', defId: 'ssl-channel', x: 750, y: 80, settings: { fader: -96, pan: 0, aux1: -96, aux2: -96, 'eq-in': true, 'dyn-in': false, mute: false, solo: false }, signalLevels: {} },
      { instanceId: 'gs-amp', defId: 'power-amp', x: 950, y: 200, settings: { power: false, level: -20, impedance: '8' }, signalLevels: {} },
      { instanceId: 'gs-spkL', defId: 'monitor-speaker', x: 1200, y: 100, settings: {}, signalLevels: {} },
      { instanceId: 'gs-spkR', defId: 'monitor-speaker', x: 1200, y: 320, settings: {}, signalLevels: {} },
    ],
    hints: [
      'Optimal signal level at each stage should be around +4 dBu (professional line level)',
      'Too much gain early in the chain causes clipping that cannot be undone downstream',
      'The VU meters on each device show you the current signal level',
    ],
    completionMessage: 'Great work! Proper gain staging ensures the best signal-to-noise ratio while avoiding distortion. This is one of the most important skills in audio engineering.',
  },
  {
    id: 'four-piece-band',
    title: '4-Piece Band Recording',
    description: 'Set up a recording session for a 4-piece band: drums (overhead), bass DI, electric guitar amp, and vocals.',
    difficulty: 'intermediate',
    category: 'Recording Sessions',
    objectives: [
      { id: 'setup-overheads', description: 'Set up a condenser mic (C414) for drum overheads through a preamp', hint: 'The C414 needs +48V phantom power. Enable it on the preamp AFTER connecting.' },
      { id: 'setup-bass', description: 'Route a signal generator (simulating bass DI) through a compressor', hint: 'Bass often goes through a compressor (LA-2A is classic) to even out dynamics.' },
      { id: 'setup-guitar', description: 'Set up an SM57 on the guitar amp through a preamp and EQ', hint: 'The SM57 is the standard mic for guitar amps. No phantom power needed for dynamic mics.' },
      { id: 'setup-vocals', description: 'Set up a U87 for vocals through a preamp and compressor', hint: 'The Neumann U87 needs +48V phantom power. Use the 1176 for vocal compression.' },
      { id: 'route-to-channels', description: 'Route all four sources to individual channel strips', hint: 'Each instrument gets its own channel strip for independent level and EQ control.' },
      { id: 'create-monitor-mix', description: 'Create a headphone monitor mix using aux sends', hint: 'Use Aux 1 sends on each channel to create a monitor mix for the performers.' },
    ],
    initialNodes: [],
    hints: [
      'Start by placing all the equipment you need from the library',
      'Condenser mics (U87, C414) need +48V phantom power; dynamic mics (SM57) do not',
      'Use aux sends to create independent monitor mixes for the performers',
    ],
    completionMessage: 'Fantastic! You\'ve set up a complete 4-piece band recording session with proper signal routing, gain staging, and monitor mixes. This is a real-world scenario you\'ll encounter in any recording studio.',
  },
  {
    id: 'phantom-power-safety',
    title: 'Phantom Power Safety',
    description: 'Learn which microphones require phantom power and which can be damaged by it. A critical safety lesson for any audio engineer.',
    difficulty: 'beginner',
    category: 'Safety & Best Practices',
    objectives: [
      { id: 'identify-condenser', description: 'Connect the Neumann U87 (condenser) and enable phantom power', hint: 'Condenser microphones have active electronics that require +48V phantom power to operate.' },
      { id: 'identify-dynamic', description: 'Connect the SM57 (dynamic) — note that phantom power is safe but unnecessary', hint: 'Dynamic mics are passive and unaffected by phantom power, but it wastes energy.' },
      { id: 'identify-ribbon', description: 'Connect the Royer R-121 (ribbon) — DO NOT enable phantom power!', hint: 'WARNING: Phantom power can permanently damage ribbon microphones by magnetizing or stretching the ribbon element.' },
    ],
    initialNodes: [
      { instanceId: 'pp-u87', defId: 'u87', x: 50, y: 50, settings: { pattern: 'cardioid', pad: false, hpf: false }, signalLevels: {} },
      { instanceId: 'pp-sm57', defId: 'sm57', x: 50, y: 200, settings: {}, signalLevels: {} },
      { instanceId: 'pp-r121', defId: 'ribbon-121', x: 50, y: 350, settings: {}, signalLevels: {} },
      { instanceId: 'pp-pre1', defId: 'neve-1073', x: 300, y: 50, settings: { gain: 40, phantom: false, phase: false, pad: false, hpf: false, 'eq-high': 0, 'eq-mid': 0, 'eq-mid-freq': 1600, 'eq-low': 0 }, signalLevels: {} },
      { instanceId: 'pp-pre2', defId: 'api-512', x: 300, y: 200, settings: { gain: 30, phantom: false, phase: false, pad: false }, signalLevels: {} },
      { instanceId: 'pp-pre3', defId: 'ssl-vhd', x: 300, y: 350, settings: { gain: 50, vhd: 0, phantom: false, phase: false, hpf: false }, signalLevels: {} },
    ],
    hints: [
      'Condenser mics REQUIRE +48V phantom power to operate',
      'Dynamic mics are unaffected by phantom power (safe but unnecessary)',
      'Ribbon mics can be PERMANENTLY DAMAGED by phantom power',
    ],
    completionMessage: 'Critical lesson learned! Always check what type of microphone you\'re connecting before enabling phantom power. This knowledge can save thousands of dollars in equipment damage.',
  },
  {
    id: 'effects-routing',
    title: 'Effects Routing: Inserts vs. Sends',
    description: 'Learn the difference between insert effects (series) and send/return effects (parallel). Master the art of effects routing.',
    difficulty: 'intermediate',
    category: 'Routing & Effects',
    objectives: [
      { id: 'insert-compressor', description: 'Insert a compressor directly in the signal chain (series routing)', hint: 'Insert effects process 100% of the signal. Place the compressor between the preamp and channel strip.' },
      { id: 'send-reverb', description: 'Set up a reverb on an aux send/return (parallel routing)', hint: 'Aux sends create a copy of the signal. The reverb processes this copy, and the wet signal is mixed back in.' },
      { id: 'set-reverb-mix', description: 'Set the reverb mix to 100% wet', hint: 'When using reverb on a send, set the mix to 100% wet because the dry signal is already in the main path.' },
      { id: 'adjust-send-level', description: 'Adjust the aux send level to control reverb amount', hint: 'The aux send level determines how much of the dry signal reaches the reverb. More send = more reverb.' },
    ],
    initialNodes: [],
    hints: [
      'Insert effects (compressors, EQ) go directly in the signal chain — they process 100% of the signal',
      'Send effects (reverb, delay) run in parallel — the dry signal passes through unaffected',
      'When using reverb on a send, always set the reverb mix to 100% wet',
    ],
    completionMessage: 'You now understand the critical difference between insert and send effects routing. This is fundamental to professional mixing technique.',
  },
  {
    id: 'monitor-mixing',
    title: 'Monitor Mix for Live Recording',
    description: 'Create independent headphone monitor mixes for multiple performers during a live recording session.',
    difficulty: 'advanced',
    category: 'Monitor Mixing',
    objectives: [
      { id: 'setup-sources', description: 'Set up at least 3 audio sources with channel strips', hint: 'Each source needs its own channel strip for independent control.' },
      { id: 'route-aux1', description: 'Create Monitor Mix 1 using Aux 1 sends (vocalist mix)', hint: 'The vocalist typically wants more of their own voice and less of other instruments.' },
      { id: 'route-aux2', description: 'Create Monitor Mix 2 using Aux 2 sends (drummer mix)', hint: 'The drummer usually wants more click track and bass in their monitor mix.' },
      { id: 'connect-headphone-amp', description: 'Route the aux outputs to a headphone amplifier', hint: 'Connect the aux send outputs to the headphone amp inputs for each performer.' },
    ],
    initialNodes: [],
    hints: [
      'Each performer needs a different balance of instruments in their headphones',
      'Aux sends on each channel control how much of that channel goes to each monitor mix',
      'The headphone amp provides individual volume control for each performer',
    ],
    completionMessage: 'Excellent! Creating comfortable monitor mixes is essential for getting great performances. Happy musicians make better music!',
  },
];

export function getScenarioById(id: string): ScenarioDef | undefined {
  return scenarios.find(s => s.id === id);
}
