/**
 * Signal Flow Lab Pro - Core Type Definitions
 * Shared between Frontend (Client) and Backend (Server)
 */

export type EquipmentCategory = 
  | 'microphone' 
  | 'preamp' 
  | 'compressor' 
  | 'eq' 
  | 'reverb' 
  | 'delay' 
  | 'monitor' 
  | 'interface' 
  | 'amp' 
  | 'patchbay' 
  | 'signal-gen' 
  | 'console';

export interface EquipmentNode {
  id: string;
  defId: string; // References the ID in equipment-library.ts
  x: number;
  y: number;
  rotation: number;
  state: Record<string, any>; // Stores knob positions, button states, etc.
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  cableColor?: string;
}

export interface StudioState {
  nodes: EquipmentNode[];
  connections: Connection[];
  selectedNodeId: string | null;
}

// Port types for physical connection logic
export type PortType = 'mic' | 'line' | 'speaker' | 'digital';

export interface PortDef {
  id: string;
  label: string;
  type: PortType;
  position: number; // 0 to 1 across the width of the unit
}