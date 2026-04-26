import { useMemo } from 'react';
import type { StudioState } from '../../../shared/equipment-types';
import { equipmentLibrary } from '@/lib/equipment-library';
import { FOUNDATIONAL_MIXER_CH_PREFIX } from '@/lib/foundational-mixer-graph';

export type PatchSocketDirection = 'out' | 'in';

export interface PatchSocket {
  id: string;
  nodeId: string;
  portId: string;
  label: string;
  direction: PatchSocketDirection;
  channelNumber: number;
}

export interface PatchStripHeading {
  label: string;
  start: number;
  end: number;
}

export interface PatchbayStrip {
  id: string;
  label: string;
  sockets: PatchSocket[];
  headings?: PatchStripHeading[];
}

export const LIVE_ROOM_MIC_PANEL_NODE_ID = 'stationary-live-room-mic-panel';

const MIXER_NODE_ID = 'foundational-mixer-master';

function socket(
  stripId: string,
  direction: PatchSocketDirection,
  channelNumber: number,
  label: string,
  nodeId: string,
  portId: string
): PatchSocket {
  return {
    id: `${stripId}:${direction}:${channelNumber}`,
    nodeId,
    portId,
    label,
    direction,
    channelNumber,
  };
}

function micLinesStrip(
  connections: StudioState['connections'],
  nodes: StudioState['nodes']
): PatchbayStrip {
  return {
    id: 'mic-lines',
    label: 'Mic Lines',
    sockets: Array.from({ length: 16 }, (_, i) => {
      const ch = i + 1;
      const conn = connections.find(
        (c) =>
          c.toNodeId === LIVE_ROOM_MIC_PANEL_NODE_ID && c.toPortId === `mic-in-${ch}`
      );
      let label = `Mic Panel ${ch}`;
      if (conn) {
        const src = nodes.find((n) => n.id === conn.fromNodeId);
        const srcDef = src ? equipmentLibrary.find((d) => d.id === src.defId) : undefined;
        if (srcDef) label = `Ch ${ch} ← ${srcDef.name}`;
      }
      return socket(
        'mic-lines',
        'out',
        ch,
        label,
        LIVE_ROOM_MIC_PANEL_NODE_ID,
        `mic-out-${ch}`
      );
    }),
  };
}

function fixedStrips(
  connections: StudioState['connections'],
  nodes: StudioState['nodes']
): PatchbayStrip[] {
  const micLines = micLinesStrip(connections, nodes);

  const micInputs: PatchbayStrip = {
    id: 'mixer-mic-inputs',
    label: 'Mixer Mic Inputs',
    sockets: Array.from({ length: 24 }, (_, i) => {
      const ch = i + 1;
      return socket(
        'mixer-mic-inputs',
        'in',
        ch,
        `Ch ${ch} Mic In`,
        `${FOUNDATIONAL_MIXER_CH_PREFIX}${ch}`,
        'in'
      );
    }),
  };

  const lineInputs: PatchbayStrip = {
    id: 'line-inputs',
    label: 'Mixer Line Inputs',
    sockets: Array.from({ length: 24 }, (_, i) => {
      const ch = i + 1;
      return socket(
        'line-inputs',
        'in',
        ch,
        `Ch ${ch} Line In`,
        MIXER_NODE_ID,
        `line-in-${ch}`
      );
    }),
  };

  const insertSends: PatchbayStrip = {
    id: 'insert-sends',
    label: 'Mixer Insert Sends',
    sockets: Array.from({ length: 24 }, (_, i) => {
      const ch = i + 1;
      return socket(
        'insert-sends',
        'out',
        ch,
        `Ch ${ch} Insert Send`,
        MIXER_NODE_ID,
        `insert-send-${ch}`
      );
    }),
  };

  const insertReturns: PatchbayStrip = {
    id: 'insert-returns',
    label: 'Mixer Insert Returns',
    sockets: Array.from({ length: 24 }, (_, i) => {
      const ch = i + 1;
      return socket(
        'insert-returns',
        'in',
        ch,
        `Ch ${ch} Insert Return`,
        MIXER_NODE_ID,
        `insert-return-${ch}`
      );
    }),
  };

  const directOuts: PatchbayStrip = {
    id: 'direct-outs',
    label: 'Mixer Direct Outs',
    sockets: Array.from({ length: 24 }, (_, i) => {
      const ch = i + 1;
      return socket(
        'direct-outs',
        'out',
        ch,
        `Ch ${ch} Direct Out`,
        MIXER_NODE_ID,
        `direct-out-${ch}`
      );
    }),
  };

  const auxSends: PatchbayStrip = {
    id: 'aux-sends',
    label: 'Mixer Aux Sends',
    sockets: [
      socket('aux-sends', 'out', 1, 'Aux 1 Send', MIXER_NODE_ID, 'aux-send-1'),
      socket('aux-sends', 'out', 2, 'Aux 2 Send', MIXER_NODE_ID, 'aux-send-2'),
      socket('aux-sends', 'out', 3, 'Aux 3 Send', MIXER_NODE_ID, 'aux-send-3'),
      socket('aux-sends', 'out', 4, 'Aux 4 Send', MIXER_NODE_ID, 'aux-send-4'),
    ],
    headings: [{ label: 'AUX SENDS', start: 1, end: 4 }],
  };

  const auxReturns: PatchbayStrip = {
    id: 'aux-returns',
    label: 'Mixer Aux Returns',
    sockets: [
      socket('aux-returns', 'in', 1, 'Aux Ret 1 L', MIXER_NODE_ID, 'aux-return-1-l'),
      socket('aux-returns', 'in', 2, 'Aux Ret 1 R', MIXER_NODE_ID, 'aux-return-1-r'),
      socket('aux-returns', 'in', 3, 'Aux Ret 2 L', MIXER_NODE_ID, 'aux-return-2-l'),
      socket('aux-returns', 'in', 4, 'Aux Ret 2 R', MIXER_NODE_ID, 'aux-return-2-r'),
    ],
    headings: [{ label: 'AUX RETURNS', start: 1, end: 4 }],
  };

  const groupOutputs: PatchbayStrip = {
    id: 'group-outputs',
    label: 'Mixer Group Outputs',
    sockets: [
      socket('group-outputs', 'out', 1, 'Group 1 L', MIXER_NODE_ID, 'group-1-l'),
      socket('group-outputs', 'out', 2, 'Group 1 R', MIXER_NODE_ID, 'group-1-r'),
      socket('group-outputs', 'out', 3, 'Group 2 L', MIXER_NODE_ID, 'group-2-l'),
      socket('group-outputs', 'out', 4, 'Group 2 R', MIXER_NODE_ID, 'group-2-r'),
      socket('group-outputs', 'out', 5, 'Group 3 L', MIXER_NODE_ID, 'group-3-l'),
      socket('group-outputs', 'out', 6, 'Group 3 R', MIXER_NODE_ID, 'group-3-r'),
      socket('group-outputs', 'out', 7, 'Group 4 L', MIXER_NODE_ID, 'group-4-l'),
      socket('group-outputs', 'out', 8, 'Group 4 R', MIXER_NODE_ID, 'group-4-r'),
    ],
    headings: [
      { label: 'GRP 1', start: 1, end: 2 },
      { label: 'GRP 2', start: 3, end: 4 },
      { label: 'GRP 3', start: 5, end: 6 },
      { label: 'GRP 4', start: 7, end: 8 },
    ],
  };

  const masterOuts: PatchbayStrip = {
    id: 'master-outs',
    label: 'Mixer Master Stereo Outputs',
    sockets: [
      socket('master-outs', 'out', 1, 'Master L', MIXER_NODE_ID, 'master-out-l'),
      socket('master-outs', 'out', 2, 'Master R', MIXER_NODE_ID, 'master-out-r'),
    ],
    headings: [{ label: 'MASTER', start: 1, end: 2 }],
  };

  return [
    micLines,
    micInputs,
    lineInputs,
    insertSends,
    insertReturns,
    directOuts,
    auxSends,
    auxReturns,
    groupOutputs,
    masterOuts,
  ];
}

function outboardRows(nodes: StudioState['nodes']): PatchbayStrip[] {
  return nodes
    .map((node) => {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def || def.id === 'live-room-mic-panel' || def.id === 'foundational-mixer-channel') {
        return null;
      }
      const out = def.outputs.slice(0, 24).map((p, i) =>
        socket(`node-${node.id}`, 'out', i + 1, `${def.name} ${p.label}`, node.id, p.id)
      );
      const input = def.inputs.slice(0, 24).map((p, i) =>
        socket(`node-${node.id}`, 'in', i + 1, `${def.name} ${p.label}`, node.id, p.id)
      );
      const sockets = [...out, ...input];
      if (!sockets.length) return null;
      return {
        id: `node-${node.id}`,
        label: `${def.name}`,
        sockets,
      } satisfies PatchbayStrip;
    })
    .filter((row): row is PatchbayStrip => row !== null);
}

export function usePatchbayRegistry(state: StudioState) {
  return useMemo(() => {
    const strips = [...fixedStrips(state.connections, state.nodes), ...outboardRows(state.nodes)];
    return { strips, columns: 24 };
  }, [state.nodes, state.connections]);
}
