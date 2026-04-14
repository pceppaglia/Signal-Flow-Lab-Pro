import React, { useRef, useEffect } from 'react';
import { StudioState, Connection } from '../../../../shared/equipment-types';
import { renderEquipmentGraphics } from '../../lib/canvas-equipment-graphics';
import { equipmentLibrary } from '../../lib/equipment-library';

interface RendererProps {
  state: StudioState;
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, x: number, y: number) => void;
  zoom: number;
}

const Renderer: React.FC<RendererProps> = ({ state, onSelectNode, onUpdateNode, zoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(zoom, zoom);

      // --- 1. DRAW STUDIO GRID/FLOOR ---
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 44) { // 1U Rack lines
        ctx.strokeStyle = y % (44*4) === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // --- 2. DRAW PATCH CABLES ---
      state.connections.forEach(conn => drawCable(ctx, conn, state));

      // --- 3. DRAW EQUIPMENT UNITS ---
      state.nodes.forEach(node => {
        const def = equipmentLibrary.find(d => d.id === node.defId);
        if (!def) return;
        
        renderEquipmentGraphics({
          ctx, 
          x: node.x, 
          y: node.y, 
          w: def.width, 
          h: def.heightUnits > 0 ? def.heightUnits * 44 : 100,
          zoom, 
          node,
          isSelected: node.id === state.selectedNodeId
        });
      });

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [state, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Detect click on equipment nodes
    const clickedNode = state.nodes.find(node => {
      const def = equipmentLibrary.find(d => d.id === node.defId);
      if (!def) return false;
      const h = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
      return x >= node.x && x <= node.x + def.width &&
             y >= node.y && y <= node.y + h;
    });

    if (clickedNode) {
      onSelectNode(clickedNode.id);
    }
  };

  const drawCable = (ctx: CanvasRenderingContext2D, conn: Connection, state: StudioState) => {
    const fromNode = state.nodes.find(n => n.id === conn.fromNodeId);
    const toNode = state.nodes.find(n => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return;

    const fDef = equipmentLibrary.find(d => d.id === fromNode.defId);
    const tDef = equipmentLibrary.find(d => d.id === toNode.defId);
    if (!fDef || !tDef) return;

    // Calculate Port Positions
    const fPort = fDef.outputs.find(p => p.id === conn.fromPortId);
    const tPort = tDef.inputs.find(p => p.id === conn.toPortId);
    if (!fPort || !tPort) return;

    const x1 = fromNode.x + (fDef.width * fPort.position);
    const y1 = fromNode.y + (fDef.heightUnits * 44) - 5;
    const x2 = toNode.x + (tDef.width * tPort.position);
    const y2 = toNode.y + 5;

    // Bezier Logic for "Patch Cable Sag"
    const cp1y = y1 + Math.abs(x2 - x1) * 0.4 + 50;
    const cp2y = y2 + Math.abs(x2 - x1) * 0.4 + 50;

    ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle = fPort.type === 'mic' ? '#aaa' : fPort.type === 'speaker' ? '#a22' : '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, cp1y, x2, cp2y, x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  return (
    <canvas 
      ref={canvasRef} 
      onMouseDown={handleMouseDown}
      width={window.innerWidth} 
      height={window.innerHeight} 
      className="bg-[#121212] cursor-crosshair" 
    />
  );
};

export default Renderer;