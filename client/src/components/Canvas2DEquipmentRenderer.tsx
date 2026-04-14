import { useEffect, useRef, useCallback, useState } from 'react';
import type { EquipmentNode, Cable } from '../../../shared/equipment-types';
import { getEquipmentById } from '@/lib/equipment-library';
import { renderEquipmentGraphics } from '@/lib/canvas-equipment-graphics';

interface Props {
  nodes: EquipmentNode[];
  cables: Cable[];
  selectedNodeId: string | null;
  viewX: number;
  viewY: number;
  zoom: number;
  onNodeMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string, direction: 'input' | 'output', portType: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portId: string) => void;
  onCableClick: (cableId: string) => void;
  onViewChange: (x: number, y: number, zoom: number) => void;
  dragState: any;
  onDragStateChange: (state: any) => void;
}

export default function Canvas2DEquipmentRenderer({
  nodes,
  cables,
  selectedNodeId,
  viewX,
  viewY,
  zoom,
  onNodeMouseDown,
  onPortMouseDown,
  onPortMouseUp,
  onCableClick,
  onViewChange,
  dragState,
  onDragStateChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Draw a single equipment component with photorealistic graphics
  const drawNode = useCallback((ctx: CanvasRenderingContext2D, node: EquipmentNode, isSelected: boolean, isHovered: boolean) => {
    const def = getEquipmentById(node.defId);
    if (!def) return;

    const x = node.x * zoom + viewX;
    const y = node.y * zoom + viewY;
    const w = def.width * zoom;
    const h = def.height * zoom;
    const accent = def.accentColor || '#E8A020';

    // Save context state
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zoom, zoom);

    // Render equipment-specific graphics
    renderEquipmentGraphics({
      ctx,
      x: 0,
      y: 0,
      w: def.width,
      h: def.height,
      zoom: 1,
      isSelected,
      isHovered,
      node,
    });

    // Selection border
    if (isSelected) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3 / zoom;
      ctx.strokeRect(0, 0, def.width, def.height);
    } else if (isHovered) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(0, 0, def.width, def.height);
    }

    ctx.restore();

    // Draw ports (in screen space, not transformed)
    // Input ports (left side)
    def.inputs.forEach((port) => {
      const py = y + (24 * zoom) + (port.position * (h - 32 * zoom));
      const portColor = port.type === 'mic' ? '#4CAF50' : port.type === 'line' ? '#E8A020' : '#6688cc';
      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.arc(x - 4 * zoom, py, 4 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Output ports (right side)
    def.outputs.forEach((port) => {
      const py = y + (24 * zoom) + (port.position * (h - 32 * zoom));
      const portColor = port.type === 'mic' ? '#4CAF50' : port.type === 'line' ? '#E8A020' : '#6688cc';
      ctx.fillStyle = portColor;
      ctx.beginPath();
      ctx.arc(x + w + 4 * zoom, py, 4 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [viewX, viewY, zoom]);

  // Draw cables
  const drawCables = useCallback((ctx: CanvasRenderingContext2D) => {
    cables.forEach(cable => {
      const fromNode = nodes.find(n => n.instanceId === cable.fromNodeId);
      const toNode = nodes.find(n => n.instanceId === cable.toNodeId);
      if (!fromNode || !toNode) return;

      const fromDef = getEquipmentById(fromNode.defId);
      const toDef = getEquipmentById(toNode.defId);
      if (!fromDef || !toDef) return;

      const fromPort = fromDef.outputs.find(p => p.id === cable.fromPortId);
      const toPort = toDef.inputs.find(p => p.id === cable.toPortId);
      if (!fromPort || !toPort) return;

      const x1 = (fromNode.x + fromDef.width) * zoom + viewX;
      const y1 = (fromNode.y + 24 + fromPort.position * (fromDef.height - 32)) * zoom + viewY;
      const x2 = toNode.x * zoom + viewX;
      const y2 = (toNode.y + 24 + toPort.position * (toDef.height - 32)) * zoom + viewY;

      // Cable color based on signal type
      const color = cable.signalType === 'mic' ? '#4CAF50' : cable.signalType === 'line' ? '#E8A020' : '#6688cc';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const controlOffset = Math.max(50 * zoom, Math.abs(x2 - x1) * 0.4);
      ctx.bezierCurveTo(x1 + controlOffset, y1, x2 - controlOffset, y2, x2, y2);
      ctx.stroke();
    });
  }, [nodes, cables, viewX, viewY, zoom]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cables first (behind nodes)
    drawCables(ctx);

    // Draw nodes
    nodes.forEach(node => {
      drawNode(ctx, node, selectedNodeId === node.instanceId, hoveredNodeId === node.instanceId);
    });
  }, [nodes, cables, selectedNodeId, hoveredNodeId, viewX, viewY, zoom, drawNode, drawCables]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert canvas coords to world coords
    const worldX = (canvasX - viewX) / zoom;
    const worldY = (canvasY - viewY) / zoom;

    // Check if clicked on a port
    for (const node of nodes) {
      const def = getEquipmentById(node.defId);
      if (!def) continue;

      // Check input ports
      for (const port of def.inputs) {
        const portX = node.x + 0;
        const portY = node.y + 24 + port.position * (def.height - 32);
        const dist = Math.sqrt((worldX - portX) ** 2 + (worldY - portY) ** 2);
        if (dist < 8) {
          onPortMouseDown(e, node.instanceId, port.id, 'input', port.type);
          return;
        }
      }

      // Check output ports
      for (const port of def.outputs) {
        const portX = node.x + def.width;
        const portY = node.y + 24 + port.position * (def.height - 32);
        const dist = Math.sqrt((worldX - portX) ** 2 + (worldY - portY) ** 2);
        if (dist < 8) {
          onPortMouseDown(e, node.instanceId, port.id, 'output', port.type);
          return;
        }
      }

      // Check if clicked on node body
      if (
        worldX >= node.x &&
        worldX <= node.x + def.width &&
        worldY >= node.y &&
        worldY <= node.y + def.height
      ) {
        onNodeMouseDown(e, node.instanceId);
        return;
      }
    }

    // Check if clicked on cable
    for (const cable of cables) {
      const fromNode = nodes.find(n => n.instanceId === cable.fromNodeId);
      const toNode = nodes.find(n => n.instanceId === cable.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromDef = getEquipmentById(fromNode.defId);
      const toDef = getEquipmentById(toNode.defId);
      if (!fromDef || !toDef) continue;

      const fromPort = fromDef.outputs.find(p => p.id === cable.fromPortId);
      const toPort = toDef.inputs.find(p => p.id === cable.toPortId);
      if (!fromPort || !toPort) continue;

      const x1 = fromNode.x + fromDef.width;
      const y1 = fromNode.y + 24 + fromPort.position * (fromDef.height - 32);
      const x2 = toNode.x;
      const y2 = toNode.y + 24 + toPort.position * (toDef.height - 32);

      // Check distance to bezier curve (simplified)
      const dist = Math.abs((y2 - y1) * worldX - (x2 - x1) * worldY + x2 * y1 - y2 * x1) / Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
      if (dist < 5) {
        onCableClick(cable.id);
        return;
      }
    }
  }, [nodes, cables, viewX, viewY, zoom, onNodeMouseDown, onPortMouseDown, onCableClick]);

  // Handle mouse move - only update hover state, let Lab.tsx handle dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldX = (canvasX - viewX) / zoom;
    const worldY = (canvasY - viewY) / zoom;

    // Check if hovering over a node
    let hoveredId: string | null = null;
    for (const node of nodes) {
      const def = getEquipmentById(node.defId);
      if (!def) continue;

      if (
        worldX >= node.x &&
        worldX <= node.x + def.width &&
        worldY >= node.y &&
        worldY <= node.y + def.height
      ) {
        hoveredId = node.instanceId;
        break;
      }
    }
    setHoveredNodeId(hoveredId);
  }, [nodes, viewX, viewY, zoom]);

  // Handle mouse up - not needed, Lab.tsx handles all drag state
  const handleMouseUp = useCallback(() => {
    // No-op, Lab.tsx manages drag state
  }, []);

  // Handle wheel (zoom)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    
    // Zoom towards cursor
    const worldX = (canvasX - viewX) / zoom;
    const worldY = (canvasY - viewY) / zoom;
    const newViewX = canvasX - worldX * newZoom;
    const newViewY = canvasY - worldY * newZoom;
    
    onViewChange(newViewX, newViewY, newZoom);
  }, [viewX, viewY, zoom, onViewChange]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="w-full h-full"
      style={{ display: 'block', touchAction: 'none', cursor: hoveredNodeId ? 'grab' : 'default' }}
    />
  );
}
