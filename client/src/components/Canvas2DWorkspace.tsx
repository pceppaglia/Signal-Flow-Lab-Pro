import React, { useEffect, useRef, useState } from 'react';
import {
  drawEquipment,
  drawCable,
  COLORS,
  CanvasRenderContext,
} from '@/lib/canvas-2d-renderer';
import type { EquipmentNode, Cable } from '@/../../shared/equipment-types';
import { getEquipmentById } from '@/lib/equipment-library';

interface Canvas2DWorkspaceProps {
  nodes: EquipmentNode[];
  cables: Cable[];
  selectedNodeId?: string;
  zoom: number;
  panX: number;
  panY: number;
  onNodeClick?: (nodeId: string, x: number, y: number) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onPortClick?: (nodeId: string, portType: 'input' | 'output', portIndex: number) => void;
}

export default function Canvas2DWorkspace({
  nodes,
  cables,
  selectedNodeId,
  zoom,
  panX,
  panY,
  onNodeClick,
  onCanvasClick,
  onPortClick,
}: Canvas2DWorkspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;

    // Create render context
    const renderCtx: CanvasRenderContext = {
      ctx,
      width: canvas.width,
      height: canvas.height,
      scale: zoom * window.devicePixelRatio,
      offsetX: panX,
      offsetY: panY,
    };

    // Clear canvas
    ctx.fillStyle = COLORS.darkBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height, zoom, panX, panY);

    // Draw cables first (so they appear behind equipment)
    cables.forEach((cable) => {
      const fromNode = nodes.find((n) => n.instanceId === cable.fromNodeId);
      const toNode = nodes.find((n) => n.instanceId === cable.toNodeId);

      if (fromNode && toNode) {
        const fromDef = getEquipmentById(fromNode.defId);
        const toDef = getEquipmentById(toNode.defId);

        if (fromDef && toDef) {
          const fromX = fromNode.x + fromDef.width;
          const fromY = fromNode.y + (fromDef.height / 2);
          const toX = toNode.x;
          const toY = toNode.y + (toDef.height / 2);

          const signalTypeMap: Record<string, 'audio' | 'control' | 'digital'> = {
            mic: 'audio',
            line: 'audio',
            speaker: 'audio',
            digital: 'digital',
          };

          drawCable(
            renderCtx,
            fromX + panX,
            fromY + panY,
            toX + panX,
            toY + panY,
            signalTypeMap[cable.signalType] || 'audio',
            true
          );
        }
      }
    });

    // Draw equipment nodes
    nodes.forEach((node) => {
      const isSelected = node.instanceId === selectedNodeId;
      const def = getEquipmentById(node.defId);

      if (!def) return;

      const x = node.x + panX;
      const y = node.y + panY;

      drawEquipment(renderCtx, x, y, def.width, def.height, {
        name: def.name,
        brand: def.brand,
        type: def.category,
        hasPhantom: def.hasPhantom,
        isClipping: node.isClipping || false,
      });

      // Draw selection highlight
      if (isSelected) {
        ctx.strokeStyle = COLORS.amber;
        ctx.lineWidth = 3 * window.devicePixelRatio;
        ctx.strokeRect(
          (x - 2) * zoom * window.devicePixelRatio,
          (y - 2) * zoom * window.devicePixelRatio,
          (def.width + 4) * zoom * window.devicePixelRatio,
          (def.height + 4) * zoom * window.devicePixelRatio
        );
      }
    });
  }, [nodes, cables, selectedNodeId, zoom, panX, panY]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // Pan the canvas (handled by parent component)
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom - panX;
    const y = (e.clientY - rect.top) / zoom - panY;

    // Check if clicked on a node
    for (const node of nodes) {
      const def = getEquipmentById(node.defId);
      if (!def) continue;

      if (
        x >= node.x &&
        x <= node.x + def.width &&
        y >= node.y &&
        y <= node.y + def.height
      ) {
        onNodeClick?.(node.instanceId, x, y);
        return;
      }
    }

    // Clicked on empty space
    onCanvasClick?.(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-black cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClick={handleCanvasClick}
    />
  );
}

/**
 * Draw a grid background
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  panX: number,
  panY: number
) {
  const gridSize = 20;
  const scaledGridSize = gridSize * zoom;

  ctx.strokeStyle = COLORS.metalDark;
  ctx.lineWidth = 0.5;

  // Vertical lines
  const startX = Math.floor((-panX * zoom) / scaledGridSize) * scaledGridSize;
  for (let x = startX; x < width; x += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  const startY = Math.floor((-panY * zoom) / scaledGridSize) * scaledGridSize;
  for (let y = startY; y < height; y += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
