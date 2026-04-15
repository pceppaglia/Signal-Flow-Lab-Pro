import React, { useRef, useEffect, useCallback } from 'react';
import { StudioState, Connection } from '../../../../shared/equipment-types';
import { renderEquipmentGraphics } from '../../lib/canvas-equipment-graphics';
import { equipmentLibrary } from '../../lib/equipment-library';

interface RendererProps {
  state: StudioState;
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, x: number, y: number) => void;
  zoom: number;
}

const Renderer: React.FC<RendererProps> = ({
  state,
  onSelectNode,
  onUpdateNode,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logicalSizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<{
    id: string;
    grabX: number;
    grabY: number;
  } | null>(null);
  const stateRef = useRef(state);
  const zoomRef = useRef(zoom);
  const onUpdateNodeRef = useRef(onUpdateNode);

  stateRef.current = state;
  zoomRef.current = zoom;
  onUpdateNodeRef.current = onUpdateNode;

  const getWorldPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const z = zoomRef.current;
      return {
        x: (clientX - rect.left) / z,
        y: (clientY - rect.top) / z,
      };
    },
    []
  );

  // HiDPI backing store + logical size (CSS pixels)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      logicalSizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    const render = () => {
      const { w: lw, h: lh } = logicalSizeRef.current;
      const dpr = window.devicePixelRatio || 1;
      const z = zoomRef.current;
      const st = stateRef.current;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (lw < 1 || lh < 1) {
        frameId = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.scale(z, z);

      const vw = lw / z;
      const vh = lh / z;

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1 / z;
      for (let x = 0; x < vw; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, vh);
        ctx.stroke();
      }
      for (let y = 0; y < vh; y += 44) {
        ctx.strokeStyle =
          y % (44 * 4) === 0
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(vw, y);
        ctx.stroke();
      }

      st.connections.forEach((conn) => drawCable(ctx, conn, st));

      st.nodes.forEach((node) => {
        const def = equipmentLibrary.find((d) => d.id === node.defId);
        if (!def) return;

        renderEquipmentGraphics({
          ctx,
          x: node.x,
          y: node.y,
          w: def.width,
          h: def.heightUnits > 0 ? def.heightUnits * 44 : 100,
          zoom: z,
          node,
          isSelected: node.id === st.selectedNodeId,
        });
      });

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [zoom]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const { x, y } = getWorldPoint(e.clientX, e.clientY);
      onUpdateNodeRef.current(d.id, x - d.grabX, y - d.grabY);
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [getWorldPoint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getWorldPoint(e.clientX, e.clientY);

    // Later nodes paint on top — pick from the end for correct hit-testing when overlapping.
    const clickedNode = [...state.nodes].reverse().find((node) => {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) return false;
      const h = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
      return (
        x >= node.x &&
        x <= node.x + def.width &&
        y >= node.y &&
        y <= node.y + h
      );
    });

    if (clickedNode) {
      onSelectNode(clickedNode.id);
      dragRef.current = {
        id: clickedNode.id,
        grabX: x - clickedNode.x,
        grabY: y - clickedNode.y,
      };
    } else {
      dragRef.current = null;
    }
  };

  const drawCable = (
    ctx: CanvasRenderingContext2D,
    conn: Connection,
    studio: StudioState
  ) => {
    const fromNode = studio.nodes.find((n) => n.id === conn.fromNodeId);
    const toNode = studio.nodes.find((n) => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return;

    const fDef = equipmentLibrary.find((d) => d.id === fromNode.defId);
    const tDef = equipmentLibrary.find((d) => d.id === toNode.defId);
    if (!fDef || !tDef) return;

    const fPort = fDef.outputs.find((p) => p.id === conn.fromPortId);
    const tPort = tDef.inputs.find((p) => p.id === conn.toPortId);
    if (!fPort || !tPort) return;

    const x1 = fromNode.x + fDef.width * fPort.position;
    const y1 = fromNode.y + fDef.heightUnits * 44 - 5;
    const x2 = toNode.x + tDef.width * tPort.position;
    const y2 = toNode.y + 5;

    const cp1y = y1 + Math.abs(x2 - x1) * 0.4 + 50;
    const cp2y = y2 + Math.abs(x2 - x1) * 0.4 + 50;

    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle =
      fPort.type === 'mic' ? '#aaa' : fPort.type === 'speaker' ? '#a22' : '#222';
    ctx.lineWidth = 3 / zoomRef.current;
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
      className="h-full w-full cursor-crosshair bg-[#121212]"
    />
  );
};

export default Renderer;
