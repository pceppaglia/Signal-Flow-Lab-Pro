import React from 'react';
import type { Cable, EquipmentNode } from '../../../shared/equipment-types';
import { getEquipmentById, signalColors } from '@/lib/equipment-library';

interface Props {
  cables: Cable[];
  nodes: EquipmentNode[];
  /** Temporary cable being drawn */
  tempCable?: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    signalType: string;
  } | null;
  onCableClick?: (cableId: string) => void;
}

function getPortWorldPosition(
  node: EquipmentNode,
  portId: string,
  direction: 'input' | 'output'
): { x: number; y: number } | null {
  const def = getEquipmentById(node.defId);
  if (!def) return null;

  const ports = direction === 'input' ? def.inputs : def.outputs;
  const port = ports.find(p => p.id === portId);
  if (!port) return null;

  const x = direction === 'input' ? node.x : node.x + def.width;
  const y = node.y + 24 + port.position * (def.height - 32);

  return { x, y };
}

/** Draw a curved cable path between two points */
function cablePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.max(50, dx * 0.4);

  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
}

export default function CableRenderer({ cables, nodes, tempCable, onCableClick }: Props) {
  return (
    <g>
      {/* Rendered cables */}
      {cables.map(cable => {
        const fromNode = nodes.find(n => n.instanceId === cable.fromNodeId);
        const toNode = nodes.find(n => n.instanceId === cable.toNodeId);
        if (!fromNode || !toNode) return null;

        const from = getPortWorldPosition(fromNode, cable.fromPortId, 'output');
        const to = getPortWorldPosition(toNode, cable.toPortId, 'input');
        if (!from || !to) return null;

        const color = signalColors[cable.signalType] || '#888';
        const path = cablePath(from.x, from.y, to.x, to.y);

        return (
          <g key={cable.id}>
            {/* Cable shadow */}
            <path
              d={path}
              fill="none"
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* Cable glow */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.15}
            />
            {/* Main cable */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onCableClick?.(cable.id);
              }}
            />
            {/* Signal flow animation */}
            <path
              d={path}
              fill="none"
              stroke="#fff"
              strokeWidth={1}
              strokeLinecap="round"
              strokeDasharray="4 12"
              opacity={0.3}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="16"
                to="0"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
            {/* Invisible wider hit area for clicking */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              strokeLinecap="round"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onCableClick?.(cable.id);
              }}
            />
          </g>
        );
      })}

      {/* Temporary cable being drawn */}
      {tempCable && (
        <g>
          <path
            d={cablePath(tempCable.fromX, tempCable.fromY, tempCable.toX, tempCable.toY)}
            fill="none"
            stroke={signalColors[tempCable.signalType] || '#888'}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="8 4"
            opacity={0.7}
          />
        </g>
      )}
    </g>
  );
}
