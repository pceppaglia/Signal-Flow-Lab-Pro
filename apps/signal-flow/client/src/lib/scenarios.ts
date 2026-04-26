import type { EquipmentNode } from '../../../shared/equipment-types';
import { equipmentLibrary } from '@/lib/equipment-library';
import { getWorkspaceZones } from '@/lib/studio-layout';

const RACK_LEFT_X = Math.round(getWorkspaceZones().rackLeft);

function withRackLeftX(nodes: EquipmentNode[]): EquipmentNode[] {
  return nodes.map((n) => {
    const def = equipmentLibrary.find((d) => d.id === n.defId);
    if (!def || def.heightUnits <= 0) return n;
    return { ...n, x: RACK_LEFT_X };
  });
}

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
    id: 'fundamentals-signal-path',
    title: 'Fundamentals: Signal Path',
    description: "Engineer's Note: Start every session by validating source -> gain -> capture. This lesson drills that core path using a vocal source, a Neve preamp, and an interface.",
    difficulty: 'beginner',
    category: 'Foundations',
    objectives: [
      { id: 'wire-source-pre', description: 'Patch Vocal Track Source to Neve 1073 mic input', hint: 'Use the source XLR out into the 1073 MIC input.' },
      { id: 'wire-pre-interface', description: 'Patch Neve 1073 line output to interface input', hint: 'The preamp output is line-level and should feed interface line or instrument input.' },
      { id: 'set-gain', description: 'Set 1073 gain into healthy range', hint: 'Aim for solid signal without clipping. Engineer target: controlled green/orange meter activity.' },
    ],
    initialNodes: withRackLeftX([
      { id: 'l1-vocal-src', defId: 'vocal-track-src', x: 80, y: 360, rotation: 0, state: {} },
      { id: 'l1-neve', defId: 'neve-1073', x: 300, y: 44, rotation: 0, state: { phantomPower: true, phantom: true, gain: 45 } },
      { id: 'l1-interface', defId: 'ua-interface', x: 300, y: 132, rotation: 0, state: {} },
    ]),
    hints: [
      'Follow source -> preamp -> converter in order.',
      'Mic-level requires proper preamp staging.',
    ],
    completionMessage: "Strong start. You’ve established the fundamental recording chain used in professional vocal sessions.",
  },
  {
    id: 'mic-vs-line-level',
    title: 'Mic vs. Line Level',
    description: "Engineer's Note: Signal type discipline prevents noise and overload. Compare mic-level kick output against line-level DI bass behavior.",
    difficulty: 'beginner',
    category: 'Gain Structure',
    objectives: [
      { id: 'patch-kick-path', description: 'Route Kick Drum Source through Neve 1073 to interface', hint: 'Kick output is mic-level and should be preamplified first.' },
      { id: 'patch-bass-path', description: 'Route Bass DI Source directly to interface line path', hint: 'Bass DI is already line-level and usually needs less preamp gain.' },
      { id: 'compare-levels', description: 'Compare meter response between both paths', hint: 'Observe how line-level arrives hotter with less gain required.' },
    ],
    initialNodes: withRackLeftX([
      { id: 'l2-kick-src', defId: 'kick-drum-src', x: 70, y: 280, rotation: 0, state: {} },
      { id: 'l2-bass-src', defId: 'bass-guitar-src', x: 70, y: 430, rotation: 0, state: {} },
      { id: 'l2-neve', defId: 'neve-1073', x: 300, y: 88, rotation: 0, state: { phantomPower: true, phantom: true, gain: 50 } },
      { id: 'l2-interface', defId: 'ua-interface', x: 300, y: 176, rotation: 0, state: {} },
    ]),
    hints: [
      'Mic sources need proper preamp gain.',
      'Line DI paths can overload if treated like mic sources.',
    ],
    completionMessage: 'You can now identify and route mic-level vs line-level sources like a working tracking engineer.',
  },
  {
    id: 'pultec-trick',
    title: 'The Pultec Trick',
    description: "Engineer's Note: The EQP-1A low-end boost/attenuate interaction shapes punch without mud when driven thoughtfully.",
    difficulty: 'intermediate',
    category: 'EQ',
    objectives: [
      { id: 'patch-kick-pultec', description: 'Patch Kick Drum Source to EQP-1A input', hint: 'Kick mic out should feed the EQ before conversion.' },
      { id: 'patch-pultec-interface', description: 'Patch EQP-1A out to interface', hint: 'Use line path out of the EQ into the interface.' },
      { id: 'set-pultec', description: 'Dial the classic low-end contour', hint: 'Try modest LF boost and attenuation together for the famous Pultec contour.' },
    ],
    initialNodes: withRackLeftX([
      { id: 'l3-kick-src', defId: 'kick-drum-src', x: 70, y: 340, rotation: 0, state: {} },
      { id: 'l3-pultec', defId: 'pultec-eqp1a', x: 300, y: 44, rotation: 0, state: {} },
      { id: 'l3-interface', defId: 'ua-interface', x: 300, y: 176, rotation: 0, state: {} },
    ]),
    hints: [
      'Pultec curves are broad and musical.',
      'Small boosts go a long way on kick fundamentals.',
    ],
    completionMessage: 'You built and tuned a classic kick-EQ chain using the Pultec workflow.',
  },
  {
    id: 'serial-compression',
    title: 'Serial Compression',
    description: "Engineer's Note: A fast FET stage into a smoother optical stage gives control plus tone for modern vocal leveling.",
    difficulty: 'advanced',
    category: 'Dynamics',
    objectives: [
      { id: 'patch-vocal-1176', description: 'Patch Vocal Track Source to 1176', hint: 'Start with moderate input for controlled GR.' },
      { id: 'patch-1176-la2a', description: 'Patch 1176 output to LA-2A input', hint: 'Fast stage first, smooth stage second.' },
      { id: 'patch-la2a-interface', description: 'Patch LA-2A output to interface', hint: 'Deliver a stable, reduced dynamic vocal to converter.' },
    ],
    initialNodes: withRackLeftX([
      { id: 'l4-vocal-src', defId: 'vocal-track-src', x: 80, y: 390, rotation: 0, state: {} },
      { id: 'l4-1176', defId: '1176-peak-limiter', x: 300, y: 44, rotation: 0, state: {} },
      { id: 'l4-la2a', defId: 'la-2a-leveling', x: 300, y: 132, rotation: 0, state: {} },
      { id: 'l4-interface', defId: 'ua-interface', x: 300, y: 264, rotation: 0, state: {} },
    ]),
    hints: [
      'Use 1176 for transient containment.',
      'Use LA-2A for smooth RMS-style leveling.',
    ],
    completionMessage: 'You completed a professional serial vocal dynamics chain with musical control.',
  },
  {
    id: 'pro-vocal-chain',
    title: 'Pro Vocal Chain',
    description: "Engineer's Note: This chain combines condenser mic detail, transformer preamp tone, and bus-style control before conversion.",
    difficulty: 'advanced',
    category: 'Tracking Chains',
    objectives: [
      { id: 'patch-u87-neve', description: 'Patch U87 mic to Neve 1073 mic input', hint: 'Enable phantom power on the preamp for condenser operation.' },
      { id: 'patch-neve-ssl', description: 'Patch Neve line output to SSL Bus Comp input', hint: 'Use line-level path between processing units.' },
      { id: 'patch-ssl-interface', description: 'Patch SSL Bus Comp output to interface', hint: 'Deliver controlled vocal to converter for recording.' },
    ],
    initialNodes: withRackLeftX([
      { id: 'l5-u87', defId: 'u87-condenser', x: 90, y: 380, rotation: 0, state: {} },
      { id: 'l5-neve', defId: 'neve-1073', x: 300, y: 44, rotation: 0, state: { phantomPower: true, phantom: true, gain: 46 } },
      { id: 'l5-ssl', defId: 'ssl-bus-comp', x: 300, y: 88, rotation: 0, state: {} },
      { id: 'l5-interface', defId: 'ua-interface', x: 300, y: 176, rotation: 0, state: {} },
    ]),
    hints: [
      'Condenser mics require phantom power through a mic preamp.',
      'Set compressor threshold after establishing preamp gain staging.',
    ],
    completionMessage: 'You assembled a modern pro vocal chain with correct level domains and processing order.',
  },
];

export function getScenarioById(id: string): ScenarioDef | undefined {
  return scenarios.find(s => s.id === id);
}
