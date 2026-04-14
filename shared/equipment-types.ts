/** Signal level types matching real-world audio engineering */
export type SignalLevel = 'mic' | 'line' | 'speaker' | 'digital';

/** Equipment categories */
export type EquipmentCategory =
  | 'source'
  | 'microphone'
  | 'preamp'
  | 'eq'
  | 'compressor'
  | 'effects'
  | 'console'
  | 'patchbay'
  | 'amplifier'
  | 'monitor'
  | 'recorder';

/** Port definition for equipment I/O */
export interface Port {
  id: string;
  label: string;
  type: SignalLevel;
  direction: 'input' | 'output';
  /** Position offset from node top (0-1 normalized) */
  position: number;
}

/** Control types for equipment parameters */
export type ControlType = 'knob' | 'fader' | 'switch' | 'button' | 'select' | 'meter';

export interface ControlDef {
  id: string;
  label: string;
  type: ControlType;
  min?: number;
  max?: number;
  step?: number;
  default: number | boolean | string;
  unit?: string;
  options?: { label: string; value: string | number }[];
  tooltip?: string;
}

/** Equipment definition (template) */
export interface EquipmentDef {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
  description: string;
  educationalInfo?: string;
  inputs: Port[];
  outputs: Port[];
  controls: ControlDef[];
  width: number;
  height: number;
  color: string;
  accentColor?: string;
  hasInsert?: boolean;
  hasPhantom?: boolean;
}

/** Placed equipment instance on the workspace */
export interface EquipmentNode {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
  settings: Record<string, number | boolean | string>;
  signalLevels: Record<string, number>;
  isClipping?: boolean;
}

/** Cable connection between two ports */
export interface Cable {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  signalType: SignalLevel;
}

/** Complete workspace state */
export interface WorkspaceState {
  nodes: EquipmentNode[];
  cables: Cable[];
  viewX: number;
  viewY: number;
  zoom: number;
}

/** Learning scenario definition */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  initialNodes?: EquipmentNode[];
  targetCables?: Cable[];
  objectives: ScenarioObjective[];
  hints: string[];
}

export interface ScenarioObjective {
  id: string;
  description: string;
  validator: string;
  completed?: boolean;
}
