import React, { useRef, useEffect, useCallback } from 'react';
import { StudioState, Connection } from '../../../../shared/equipment-types';
import {
  renderEquipmentGraphics,
  drawRackRails,
  hitTestInteractiveControl,
  hitTestAnyPort,
  getPortAnchor,
  type PortPick,
} from '../../lib/canvas-equipment-graphics';
import type { SignalLevel } from '../../lib/equipment-library';
import { equipmentLibrary } from '../../lib/equipment-library';

interface RendererProps {
  state: StudioState;
  deskNode?: StudioState['nodes'][number] | null;
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, x: number, y: number) => void;
  onControlChange?: (
    nodeId: string,
    controlId: string,
    value: number | boolean
  ) => void;
  onConnect?: (
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) => void;
  zoom: number;
}

const KNOB_DRAG_SENS = 0.35;

function sagControlPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { cp1y: number; cp2y: number } {
  const sag = Math.min(240, 56 + Math.abs(x2 - x1) * 0.48);
  const midY = Math.max(y1, y2) + sag;
  return { cp1y: midY, cp2y: midY };
}

function drawCablePath(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const { cp1y, cp2y } = sagControlPoints(x1, y1, x2, y2);
  ctx.bezierCurveTo(x1, cp1y, x2, cp2y, x2, y2);
}

type PaintCableOpts = { improperHint?: boolean; nowMs?: number };

function paintCable(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zoom: number,
  kind: 'mic' | 'line' | 'speaker' | 'digital',
  opts?: PaintCableOpts
): void {
  const z = zoom;
  ctx.save();
  if (opts?.improperHint && opts.nowMs != null) {
    const pulse =
      0.4 + 0.22 * Math.sin(opts.nowMs / 185) + 0.12 * Math.sin(opts.nowMs / 263);
    ctx.globalAlpha = Math.max(0.3, Math.min(0.78, pulse));
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1);

  if (kind === 'speaker') {
    ctx.setLineDash([]);
    const { cp1y, cp2y } = sagControlPoints(x1, y1, x2, y2);
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.strokeStyle = '#0d0d0d';
    ctx.lineWidth = 5 / z;
    ctx.beginPath();
    ctx.moveTo(x1 + 0.8, y1 + 1.2);
    ctx.bezierCurveTo(x1 + 0.8, cp1y + 2, x2 + 0.8, cp2y + 2, x2 + 0.8, y2 + 1.2);
    ctx.stroke();
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 2.8 / z;
    ctx.beginPath();
    ctx.moveTo(x1 - 0.8, y1 - 1.2);
    ctx.bezierCurveTo(x1 - 0.8, cp1y - 2, x2 - 0.8, cp2y - 2, x2 - 0.8, y2 - 1.2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (opts?.improperHint) ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  if (kind === 'mic') {
    ctx.strokeStyle = '#00e5ff';
  } else if (kind === 'digital') {
    ctx.strokeStyle = '#90caf9';
  } else {
    ctx.strokeStyle = '#43a047';
  }
  ctx.lineWidth = 3.2 / z;
  drawCablePath(ctx, x1, y1, x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (opts?.improperHint) ctx.globalAlpha = 1;
  ctx.restore();
}

function connectionVisualKind(conn: Connection): 'mic' | 'line' | 'speaker' | 'digital' {
  const t = conn.cableColor;
  if (t === 'mic' || t === 'line' || t === 'speaker' || t === 'digital') return t;
  return 'line';
}

/** Mic-level source into a line-level input on non-preamp gear (weak / impedance mismatch hint). */
function connectionIsImproperMicToLine(
  conn: Connection,
  studio: StudioState,
  deskNode?: StudioState['nodes'][number] | null
): boolean {
  const resolveNode = (nodeId: string) => {
    const found = studio.nodes.find((n) => n.id === nodeId);
    if (found) return found;
    if (deskNode && deskNode.id === nodeId) return deskNode;
    return null;
  };

  const fromNode = resolveNode(conn.fromNodeId);
  const toNode = resolveNode(conn.toNodeId);
  if (!fromNode || !toNode) return false;

  const fDef = equipmentLibrary.find((d) => d.id === fromNode.defId);
  const tDef = equipmentLibrary.find((d) => d.id === toNode.defId);
  if (!fDef || !tDef) return false;

  const fromPort = fDef.outputs.find((p) => p.id === conn.fromPortId);
  const toPort = tDef.inputs.find((p) => p.id === conn.toPortId);
  if (!fromPort || !toPort) return false;

  if (fromPort.type !== 'mic' || toPort.type !== 'line') return false;
  if (tDef.category === 'preamp') return false;
  return true;
}

function findInputPortPickAt(
  wx: number,
  wy: number,
  studio: StudioState,
  deskNode: StudioState['nodes'][number] | null | undefined,
  vw: number,
  vh: number,
  excludeFromId: string
): PortPick | null {
  let target: PortPick | null = null;
  if (deskNode && wy >= vh * 0.5) {
    const deskDef = equipmentLibrary.find((d) => d.id === deskNode.defId);
    if (deskDef) {
      target = hitTestAnyPort(wx, wy, deskNode, deskDef, {
        x: (vw - deskDef.width) / 2,
        y: vh * 0.5,
        width: deskDef.width,
        height: vh * 0.5,
      });
      if (target && target.side !== 'input') target = null;
    }
  }
  for (const node of [...studio.nodes].reverse()) {
    if (target) break;
    if (node.id === excludeFromId) continue;
    const def = equipmentLibrary.find((d) => d.id === node.defId);
    if (!def) continue;
    const hit = hitTestAnyPort(wx, wy, node, def);
    if (hit?.side === 'input') {
      target = hit;
      break;
    }
  }
  return target;
}

function drawStudioCable(
  ctx: CanvasRenderingContext2D,
  conn: Connection,
  studio: StudioState,
  z: number,
  deskNode?: StudioState['nodes'][number] | null,
  viewport?: { w: number; h: number },
  nowMs?: number
): void {
  const resolveNode = (nodeId: string) => {
    const found = studio.nodes.find((n) => n.id === nodeId);
    if (found) return found;
    if (deskNode && deskNode.id === nodeId) return deskNode;
    return null;
  };

  const fromNode = resolveNode(conn.fromNodeId);
  const toNode = resolveNode(conn.toNodeId);
  if (!fromNode || !toNode) return;

  const fDef = equipmentLibrary.find((d) => d.id === fromNode.defId);
  const tDef = equipmentLibrary.find((d) => d.id === toNode.defId);
  if (!fDef || !tDef) return;

  const deskBounds =
    viewport && deskNode
      ? {
          x: (viewport.w - fDef.width) / 2,
          y: viewport.h * 0.5,
          width: fDef.width,
          height: viewport.h * 0.5,
        }
      : null;
  const toDeskBounds =
    viewport && deskNode
      ? {
          x: (viewport.w - tDef.width) / 2,
          y: viewport.h * 0.5,
          width: tDef.width,
          height: viewport.h * 0.5,
        }
      : null;

  const fromDeskPort = fDef.outputs.find((p) => p.id === conn.fromPortId);
  const toDeskPort = tDef.inputs.find((p) => p.id === conn.toPortId);
  const p1 =
    fromNode.id === deskNode?.id && deskBounds && fromDeskPort
      ? {
          x: deskBounds.x + fromDeskPort.position * fDef.width,
          y: deskBounds.y + deskBounds.height - 5,
        }
      : getPortAnchor(fromNode, fDef, conn.fromPortId, 'output');
  const p2 =
    toNode.id === deskNode?.id && toDeskBounds && toDeskPort
      ? { x: toDeskBounds.x + toDeskPort.position * tDef.width, y: toDeskBounds.y + 5 }
      : getPortAnchor(toNode, tDef, conn.toPortId, 'input');
  if (!p1 || !p2) return;

  const improper = connectionIsImproperMicToLine(conn, studio, deskNode);
  paintCable(ctx, p1.x, p1.y, p2.x, p2.y, z, connectionVisualKind(conn), {
    improperHint: improper,
    nowMs,
  });
}

const Renderer: React.FC<RendererProps> = ({
  state,
  onSelectNode,
  onUpdateNode,
  onControlChange,
  onConnect,
  deskNode,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logicalSizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef<{
    id: string;
    grabX: number;
    grabY: number;
  } | null>(null);
  const knobDragRef = useRef<{
    nodeId: string;
    controlId: string;
    min: number;
    max: number;
    startClientY: number;
    startValue: number;
  } | null>(null);

  const cableDragRef = useRef<{
    fromNodeId: string;
    fromPortId: string;
    signalType: SignalLevel;
  } | null>(null);
  const cablePreviewRef = useRef<{ x: number; y: number } | null>(null);

  const stateRef = useRef(state);
  const zoomRef = useRef(zoom);
  const onUpdateNodeRef = useRef(onUpdateNode);
  const onControlChangeRef = useRef(onControlChange);
  const onConnectRef = useRef(onConnect);
  const deskNodeRef = useRef(deskNode);

  stateRef.current = state;
  zoomRef.current = zoom;
  onUpdateNodeRef.current = onUpdateNode;
  onControlChangeRef.current = onControlChange;
  onConnectRef.current = onConnect;
  deskNodeRef.current = deskNode;

  const getWorldPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const z = zoomRef.current;
    return {
      x: (clientX - rect.left) / z,
      y: (clientY - rect.top) / z,
    };
  }, []);

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
      for (let gx = 0; gx < vw; gx += 100) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, vh);
        ctx.stroke();
      }
      for (let gy = 0; gy < vh; gy += 44) {
        ctx.strokeStyle =
          gy % (44 * 4) === 0
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(vw, gy);
        ctx.stroke();
      }

      drawRackRails(ctx, vh, z);

      ctx.setLineDash([]);
      const nowMs = performance.now();
      st.connections.forEach((conn) => {
        drawStudioCable(ctx, conn, st, z, deskNodeRef.current, { w: vw, h: vh }, nowMs);
      });

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

      const drag = cableDragRef.current;
      const preview = cablePreviewRef.current;
      if (drag && preview) {
        const fromN =
          st.nodes.find((n) => n.id === drag.fromNodeId) ??
          (deskNodeRef.current?.id === drag.fromNodeId ? deskNodeRef.current : undefined);
        const fromD = fromN
          ? equipmentLibrary.find((d) => d.id === fromN.defId)
          : undefined;
        if (fromN && fromD) {
          const deskBounds =
            fromN.id === deskNodeRef.current?.id
              ? {
                  x: (vw - fromD.width) / 2,
                  y: vh * 0.5,
                  width: fromD.width,
                  height: vh * 0.5,
                }
              : undefined;
          const deskOutput = fromD.outputs.find((p) => p.id === drag.fromPortId);
          const a = deskBounds && deskOutput
            ? {
                x: deskBounds.x + deskOutput.position * fromD.width,
                y: deskBounds.y + deskBounds.height - 5,
              }
            : getPortAnchor(fromN, fromD, drag.fromPortId, 'output');
          if (a) {
            const kind =
              drag.signalType === 'mic'
                ? 'mic'
                : drag.signalType === 'speaker'
                  ? 'speaker'
                  : drag.signalType === 'digital'
                    ? 'digital'
                    : 'line';
            const hoverPick = findInputPortPickAt(
              preview.x,
              preview.y,
              st,
              deskNodeRef.current,
              vw,
              vh,
              drag.fromNodeId
            );
            let previewImproper = false;
            if (hoverPick && drag.signalType === 'mic') {
              const toN =
                st.nodes.find((n) => n.id === hoverPick.nodeId) ??
                (deskNodeRef.current?.id === hoverPick.nodeId
                  ? deskNodeRef.current
                  : undefined);
              const toD = toN
                ? equipmentLibrary.find((d) => d.id === toN.defId)
                : undefined;
              const toPort = toD?.inputs.find((p) => p.id === hoverPick.portId);
              if (
                toD &&
                toPort?.type === 'line' &&
                toD.category !== 'preamp'
              ) {
                previewImproper = true;
              }
            }
            ctx.setLineDash([6 / z, 4 / z]);
            paintCable(ctx, a.x, a.y, preview.x, preview.y, z, kind, {
              improperHint: previewImproper,
              nowMs,
            });
            ctx.setLineDash([]);
          }
        }
      }

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [zoom]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { x, y } = getWorldPoint(e.clientX, e.clientY);
      if (cableDragRef.current) {
        cablePreviewRef.current = { x, y };
      }

      const kd = knobDragRef.current;
      if (kd && onControlChangeRef.current) {
        const dy = kd.startClientY - e.clientY;
        const span = kd.max - kd.min;
        const delta = dy * KNOB_DRAG_SENS * (span / 120);
        let v = kd.startValue + delta;
        v = Math.max(kd.min, Math.min(kd.max, v));
        onControlChangeRef.current(kd.nodeId, kd.controlId, v);
        return;
      }

      const d = dragRef.current;
      if (!d) return;
      onUpdateNodeRef.current(d.id, x - d.grabX, y - d.grabY);
    };

    const onUp = (e: MouseEvent) => {
      const cd = cableDragRef.current;
      if (cd && onConnectRef.current) {
        const { x, y } = getWorldPoint(e.clientX, e.clientY);
        const { h: lh } = logicalSizeRef.current;
        const vh = lh / zoomRef.current;
        let target: PortPick | null = null;
        if (deskNodeRef.current && y >= vh * 0.5) {
          const deskDef = equipmentLibrary.find((d) => d.id === deskNodeRef.current.defId);
          if (deskDef) {
            target = hitTestAnyPort(x, y, deskNodeRef.current, deskDef, {
              x: (logicalSizeRef.current.w / zoomRef.current - deskDef.width) / 2,
              y: vh * 0.5,
              width: deskDef.width,
              height: vh * 0.5,
            });
            if (target && target.side !== 'input') target = null;
          }
        }
        for (const node of [...stateRef.current.nodes].reverse()) {
          if (target) break;
          if (node.id === cd.fromNodeId) continue;
          const def = equipmentLibrary.find((d) => d.id === node.defId);
          if (!def) continue;
          const hit = hitTestAnyPort(x, y, node, def);
          if (hit?.side === 'input') {
            target = hit;
            break;
          }
        }
        if (target) {
          onConnectRef.current(
            cd.fromNodeId,
            cd.fromPortId,
            target.nodeId,
            target.portId
          );
        }
      }
      cableDragRef.current = null;
      cablePreviewRef.current = null;

      dragRef.current = null;
      knobDragRef.current = null;
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
    const vh = logicalSizeRef.current.h / zoomRef.current;
    if (deskNode && y >= vh * 0.5) {
      const deskDef = equipmentLibrary.find((d) => d.id === deskNode.defId);
      if (deskDef) {
        const deskPortHit = hitTestAnyPort(x, y, deskNode, deskDef, {
          x: (logicalSizeRef.current.w / zoomRef.current - deskDef.width) / 2,
          y: vh * 0.5,
          width: deskDef.width,
          height: vh * 0.5,
        });
        if (deskPortHit?.side === 'output') {
          cableDragRef.current = {
            fromNodeId: deskPortHit.nodeId,
            fromPortId: deskPortHit.portId,
            signalType: deskPortHit.type,
          };
          cablePreviewRef.current = { x, y };
          onSelectNode(deskPortHit.nodeId);
          dragRef.current = null;
          return;
        }
      }
    }

    knobDragRef.current = null;
    cableDragRef.current = null;
    cablePreviewRef.current = { x, y };

    for (const node of [...stateRef.current.nodes].reverse()) {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) continue;
      const portHit = hitTestAnyPort(x, y, node, def);
      if (portHit?.side === 'output') {
        cableDragRef.current = {
          fromNodeId: portHit.nodeId,
          fromPortId: portHit.portId,
          signalType: portHit.type,
        };
        cablePreviewRef.current = { x, y };
        onSelectNode(portHit.nodeId);
        dragRef.current = null;
        return;
      }
    }

    for (const node of [...stateRef.current.nodes].reverse()) {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) continue;
      const hit = hitTestInteractiveControl(x, y, node, def);
      if (hit) {
        if (hit.kind === 'knob') {
          knobDragRef.current = {
            nodeId: hit.nodeId,
            controlId: hit.controlId,
            min: hit.min,
            max: hit.max,
            startClientY: e.clientY,
            startValue: hit.value,
          };
          onSelectNode(hit.nodeId);
        } else if (hit.kind === 'switch') {
          onSelectNode(hit.nodeId);
          onControlChangeRef.current?.(hit.nodeId, hit.controlId, !hit.value);
        } else if (hit.kind === 'ratio') {
          onSelectNode(hit.nodeId);
          onControlChangeRef.current?.(hit.nodeId, 'ratio', hit.value);
        }
        dragRef.current = null;
        return;
      }
    }

    const clickedNode = [...stateRef.current.nodes].reverse().find((node) => {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) return false;
      const hh = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
      return (
        x >= node.x &&
        x <= node.x + def.width &&
        y >= node.y &&
        y <= node.y + hh
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

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      className="h-full w-full cursor-crosshair bg-[#121212]"
    />
  );
};

export default Renderer;
