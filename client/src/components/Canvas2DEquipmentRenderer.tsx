import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
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

const Canvas2DEquipmentRenderer = forwardRef<HTMLCanvasElement, Props>((props, ref) => {
  const { nodes, cables, selectedNodeId, viewX, viewY, zoom, onNodeMouseDown, onDragStateChange, dragState } = props;
  const internalRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => internalRef.current!);

  useEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  const drawRackRails = useCallback((ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1;
    const rackX = (100 * zoom + viewX) * dpr;
    const rackW = 600 * zoom * dpr;
    
    // Dark Rack Interior
    ctx.fillStyle = '#050505';
    ctx.fillRect(rackX, 0, rackW, 5000);

    // Metallic Side Rails
    const railW = 20 * zoom * dpr;
    const railGrad = ctx.createLinearGradient(rackX - railW, 0, rackX, 0);
    railGrad.addColorStop(0, '#222');
    railGrad.addColorStop(0.5, '#444');
    railGrad.addColorStop(1, '#222');
    
    ctx.fillStyle = railGrad;
    ctx.fillRect(rackX - railW, 0, railW, 5000); // Left Rail
    ctx.fillRect(rackX + rackW, 0, railW, 5000); // Right Rail

    // Rack Unit Screw Holes (1U = 44px)
    ctx.fillStyle = '#000';
    for (let i = 0; i < 50; i++) {
        const y = (i * 44 * zoom + viewY + 22) * dpr;
        ctx.beginPath(); ctx.arc(rackX - railW/2, y, 3 * dpr, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(rackX + rackW + railW/2, y, 3 * dpr, 0, Math.PI*2); ctx.fill();
    }
  }, [viewX, viewY, zoom]);

  const drawNode = useCallback((ctx: CanvasRenderingContext2D, node: EquipmentNode, isSelected: boolean) => {
    const def = getEquipmentById(node.defId);
    if (!def) return;

    const dpr = window.devicePixelRatio || 1;
    const isMic = def.category === 'microphone';
    
    // Snapping Logic: Rack gear snaps to 100px X and 44px Y grid
    const nx = isMic ? node.x : 100;
    const ny = isMic ? node.y : Math.round(node.y / 44) * 44;

    const x = (nx * zoom + viewX) * dpr;
    const y = (ny * zoom + viewY) * dpr;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zoom * dpr, zoom * dpr);

    // Drop Shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    renderEquipmentGraphics({
      ctx, x: 0, y: 0, w: def.width, h: def.height,
      zoom: 1, isSelected, isHovered: false, node,
    });

    if (isSelected) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#E8A020';
        ctx.lineWidth = 3 / zoom;
        ctx.strokeRect(-1, -1, def.width + 2, def.height + 2);
    }
    ctx.restore();
  }, [viewX, viewY, zoom]);

  useEffect(() => {
    const canvas = internalRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawRackRails(ctx);
    nodes.forEach(node => drawNode(ctx, node, selectedNodeId === node.instanceId));
  }, [nodes, selectedNodeId, viewX, viewY, zoom, drawNode, drawRackRails]);

  return (
    <canvas
      ref={internalRef}
      onMouseDown={(e) => {
        const rect = internalRef.current?.getBoundingClientRect();
        if (!rect) return;
        const worldX = (e.clientX - rect.left - viewX) / zoom;
        const worldY = (e.clientY - rect.top - viewY) / zoom;
        for (const node of nodes) {
            const def = getEquipmentById(node.defId);
            if (!def) continue;
            const nx = (def.category === 'microphone' ? node.x : 100);
            const ny = (def.category === 'microphone' ? node.y : Math.round(node.y / 44) * 44);
            if (worldX >= nx && worldX <= nx + def.width && worldY >= ny && worldY <= ny + def.height) {
                onNodeMouseDown(e, node.instanceId);
                return;
            }
        }
      }}
      onMouseMove={(e) => {
        if (dragState?.type === 'node') {
            const rect = internalRef.current?.getBoundingClientRect()!;
            onDragStateChange({
                ...dragState,
                cursorX: (e.clientX - rect.left - viewX) / zoom,
                cursorY: (e.clientY - rect.top - viewY) / zoom
            });
        }
      }}
      className="w-full h-full block bg-black"
    />
  );
});

export default Canvas2DEquipmentRenderer;