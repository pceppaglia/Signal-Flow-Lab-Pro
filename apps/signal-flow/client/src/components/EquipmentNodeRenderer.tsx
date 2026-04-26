import React, { useMemo } from 'react';
import type { EquipmentNode } from '../../../shared/equipment-types';
import { getEquipmentById, signalColors } from '@/lib/equipment-library';

interface Props {
  node: EquipmentNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string, direction: 'input' | 'output', portType: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portId: string) => void;
  onPortHover: (nodeId: string, portId: string) => void;
  onPortLeave: () => void;
  hoveredPort: { nodeId: string; portId: string } | null;
}

/**
 * SVG-based Equipment Renderer with realistic 2D graphics
 * Draws professional-looking equipment with gradient fills, realistic controls, and metering
 */
export default function EquipmentNodeRenderer({
  node, isSelected, onMouseDown, onPortMouseDown, onPortMouseUp, onPortHover, onPortLeave, hoveredPort
}: Props) {
  const def = useMemo(() => getEquipmentById(node.defId), [node.defId]);
  if (!def) return null;

  const w = def.width;
  const h = def.height;
  const accent = def.accentColor || '#E8A020';

  // Compute port positions
  const inputPorts = def.inputs.map(p => ({
    port: p,
    x: 0,
    y: 24 + p.position * (h - 32),
  }));

  const outputPorts = def.outputs.map(p => ({
    port: p,
    x: w,
    y: 24 + p.position * (h - 32),
  }));

  // Signal level for meter
  const firstOutput = def.outputs[0];
  const outputLevel = firstOutput ? (node.signalLevels[firstOutput.id] ?? -100) : -100;

  // Normalize level (-60 to +24 dBu)
  const meterNormalized = Math.max(0, Math.min(1, (outputLevel + 60) / 84));
  const meterBarHeight = meterNormalized * (h - 34);
  const isHot = outputLevel > 4;
  const isClipping = node.isClipping ?? false;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={(e) => onMouseDown(e, node.instanceId)}
      style={{ cursor: 'grab' }}
      className="equipment-node"
    >
      {/* Gradient definitions */}
      <defs>
        <linearGradient id={`grad-${node.instanceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={def.color} stopOpacity="1" />
          <stop offset="100%" stopColor={def.color} stopOpacity="0.85" />
        </linearGradient>
        <filter id={`shadow-${node.instanceId}`}>
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Shadow */}
      <rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill="rgba(0,0,0,0.6)" />

      {/* Main body with gradient */}
      <rect
        x={0} y={0} width={w} height={h} rx={4}
        fill={`url(#grad-${node.instanceId})`}
        stroke={isSelected ? '#E8A020' : '#333'}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />

      {/* Top accent bar with gradient */}
      <defs>
        <linearGradient id={`accent-${node.instanceId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
          <stop offset="50%" stopColor={accent} stopOpacity="0.15" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={22} rx={4} fill={`url(#accent-${node.instanceId})`} />
      <line x1={0} y1={22} x2={w} y2={22} stroke={accent} strokeWidth={2} opacity={0.5} />

      {/* Category icon */}
      <g transform="translate(4, 3)">
        <CategoryIcon category={def.category} color={accent} />
      </g>

      {/* Brand name */}
      <text
        x={24} y={14} fill={accent} fontSize="9" fontWeight="bold"
        fontFamily="'JetBrains Mono', monospace" letterSpacing="0.05em"
      >
        {def.brand}
      </text>

      {/* Model name (top right) */}
      <text
        x={w - 4} y={14} textAnchor="end" fill="#888" fontSize="8"
        fontFamily="'JetBrains Mono', monospace"
      >
        {def.model}
      </text>

      {/* Equipment name (center) */}
      <text
        x={w / 2} y={38} textAnchor="middle" fill="#F5F0E8" fontSize="11"
        fontWeight="bold" fontFamily="'Bebas Neue', Impact, sans-serif" letterSpacing="0.05em"
      >
        {def.name}
      </text>

      {/* Mini VU meter (right side) */}
      {def.outputs.length > 0 && (
        <g>
          {/* Meter background */}
          <rect x={w - 14} y={26} width={8} height={h - 34} rx={1} fill="#0a0a0a" stroke="#333" strokeWidth={0.5} />
          {/* Meter bar */}
          <rect
            x={w - 13} y={26 + (h - 34) - meterBarHeight} width={6} height={meterBarHeight}
            fill={isClipping ? '#ff2222' : isHot ? '#E8A020' : '#4CAF50'}
            rx={0.5}
          />
          {/* Meter scale markers */}
          <line x1={w - 15} y1={26 + (h - 34) * 0.25} x2={w - 12} y2={26 + (h - 34) * 0.25} stroke="#444" strokeWidth={0.5} />
          <line x1={w - 15} y1={26 + (h - 34) * 0.5} x2={w - 12} y2={26 + (h - 34) * 0.5} stroke="#444" strokeWidth={0.5} />
          <line x1={w - 15} y1={26 + (h - 34) * 0.75} x2={w - 12} y2={26 + (h - 34) * 0.75} stroke="#444" strokeWidth={0.5} />
        </g>
      )}

      {/* Clipping indicator */}
      {isClipping && (
        <g>
          <rect x={w - 24} y={26} width={8} height={8} rx={1} fill="#ff2222" opacity={0.9} />
          <text x={w - 20} y={33} textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold">!</text>
        </g>
      )}

      {/* Phantom power indicator */}
      {def.hasPhantom && node.settings.phantom === true && (
        <g>
          <rect x={4} y={h - 16} width={28} height={12} rx={2} fill={accent} opacity={0.9} />
          <text x={18} y={h - 7} textAnchor="middle" fill="#0D0D0D" fontSize="7" fontWeight="bold">+48V</text>
        </g>
      )}

      {/* Console-specific controls */}
      {def.category === 'console' && (
        <g>
          {/* Fader track background */}
          <rect x={w / 2 - 4} y={50} width={8} height={h - 70} rx={3} fill="#0a0a0a" stroke="#333" strokeWidth={0.5} />
          
          {/* Fader cap */}
          {(() => {
            const faderVal = (node.settings.fader as number) ?? 0;
            const faderNorm = Math.max(0, Math.min(1, (faderVal + 96) / 106));
            const faderY = 50 + (1 - faderNorm) * (h - 70);
            return (
              <g>
                <defs>
                  <linearGradient id={`fader-${node.instanceId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#666" />
                    <stop offset="50%" stopColor="#888" />
                    <stop offset="100%" stopColor="#666" />
                  </linearGradient>
                </defs>
                <rect
                  x={w / 2 - 8} y={faderY - 5} width={16} height={10} rx={2}
                  fill={`url(#fader-${node.instanceId})`}
                  stroke="#999" strokeWidth={0.5}
                />
                {/* Fader grip lines */}
                <line x1={w / 2 - 4} y1={faderY - 2} x2={w / 2 + 4} y2={faderY - 2} stroke="#555" strokeWidth={0.5} />
                <line x1={w / 2 - 4} y1={faderY} x2={w / 2 + 4} y2={faderY} stroke="#555" strokeWidth={0.5} />
                <line x1={w / 2 - 4} y1={faderY + 2} x2={w / 2 + 4} y2={faderY + 2} stroke="#555" strokeWidth={0.5} />
              </g>
            );
          })()}

          {/* Mute button */}
          {node.settings.mute && (
            <g>
              <rect x={4} y={h - 16} width={20} height={12} rx={2} fill="#C0392B" opacity={0.9} />
              <text x={14} y={h - 7} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">M</text>
            </g>
          )}
        </g>
      )}

      {/* Input ports */}
      {inputPorts.map(({ port, x, y }) => (
        <PortDot
          key={port.id}
          port={port}
          x={x}
          y={y}
          nodeId={node.instanceId}
          isHovered={hoveredPort?.nodeId === node.instanceId && hoveredPort?.portId === port.id}
          onMouseDown={onPortMouseDown}
          onMouseUp={onPortMouseUp}
          onHover={onPortHover}
          onLeave={onPortLeave}
        />
      ))}

      {/* Output ports */}
      {outputPorts.map(({ port, x, y }) => (
        <PortDot
          key={port.id}
          port={port}
          x={x}
          y={y}
          nodeId={node.instanceId}
          isHovered={hoveredPort?.nodeId === node.instanceId && hoveredPort?.portId === port.id}
          onMouseDown={onPortMouseDown}
          onMouseUp={onPortMouseUp}
          onHover={onPortHover}
          onLeave={onPortLeave}
        />
      ))}
    </g>
  );
}

/**
 * Category icons as SVG shapes
 */
function CategoryIcon({ category, color }: { category: string; color: string }) {
  const s = 16;
  switch (category) {
    case 'microphone':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <ellipse cx="8" cy="5" rx="3" ry="4" fill="none" stroke={color} strokeWidth="1.2" />
          <line x1="8" y1="9" x2="8" y2="13" stroke={color} strokeWidth="1.2" />
          <line x1="5" y1="13" x2="11" y2="13" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'preamp':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <polygon points="2,12 8,3 14,12" fill="none" stroke={color} strokeWidth="1.2" />
          <text x="8" y="11" textAnchor="middle" fill={color} fontSize="6" fontWeight="bold">+</text>
        </svg>
      );
    case 'compressor':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <polyline points="2,12 6,12 10,5 14,5" fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'eq':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <polyline points="1,10 4,4 8,12 12,6 15,8" fill="none" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'effects':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <path d="M2,8 Q5,2 8,8 Q11,14 14,8" fill="none" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'console':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke={color} strokeWidth="1.2" />
          <line x1="5" y1="6" x2="5" y2="10" stroke={color} strokeWidth="1.5" />
          <line x1="8" y1="5" x2="8" y2="10" stroke={color} strokeWidth="1.5" />
          <line x1="11" y1="7" x2="11" y2="10" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'monitor':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="5" fill="none" stroke={color} strokeWidth="1.2" />
          <circle cx="8" cy="8" r="2" fill={color} opacity="0.5" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 16 16">
          <rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.2" />
        </svg>
      );
  }
}

/**
 * Port connector dot with glow effect
 */
function PortDot({ port, x, y, nodeId, isHovered, onMouseDown, onMouseUp, onHover, onLeave }: {
  port: any; x: number; y: number; nodeId: string; isHovered: boolean;
  onMouseDown: (e: React.MouseEvent, nodeId: string, portId: string, direction: 'input' | 'output', portType: string) => void;
  onMouseUp: (e: React.MouseEvent, nodeId: string, portId: string) => void;
  onHover: (nodeId: string, portId: string) => void;
  onLeave: () => void;
}) {
  const color = signalColors[port.type] || '#888';
  const r = isHovered ? 7 : 5;

  return (
    <g
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e as any, nodeId, port.id, port.direction, port.type); }}
      onMouseUp={(e) => { e.stopPropagation(); onMouseUp(e as any, nodeId, port.id); }}
      onMouseEnter={() => onHover(nodeId, port.id)}
      onMouseLeave={onLeave}
      style={{ cursor: 'crosshair' }}
    >
      {/* Glow */}
      <circle cx={x} cy={y} r={r + 4} fill={color} opacity={isHovered ? 0.3 : 0.1} />
      {/* Outer ring */}
      <circle cx={x} cy={y} r={r} fill="#111" stroke={color} strokeWidth={2} />
      {/* Inner dot */}
      <circle cx={x} cy={y} r={2} fill={color} />
      {/* Label */}
      <text
        x={port.direction === 'input' ? x - 12 : x + 12}
        y={y + 3}
        textAnchor={port.direction === 'input' ? 'end' : 'start'}
        fill="#888"
        fontSize="8"
        fontFamily="'JetBrains Mono', monospace"
      >
        {port.label}
      </text>
    </g>
  );
}
