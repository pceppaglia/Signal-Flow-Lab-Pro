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
import { equipmentLibrary, signalColors } from '../../lib/equipment-library';
import { audioEngine } from '../../lib/audio-engine-v2';
import { getStudioZones, isRackGearInVerticalBay } from '@/lib/studio-layout';

interface RendererProps {
  state: StudioState;
  deskNode?: StudioState['nodes'][number] | null;
  onSelectNode: (id: string) => void;
  onUpdateNode: (id: string, x: number, y: number) => void;
  onControlChange?: (
    nodeId: string,
    controlId: string,
    value: number | boolean | string
  ) => void;
  onConnect?: (
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) => void;
  onAddCable?: (
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) => void;
  selectedCableId?: string | null;
  onSelectCable?: (cableId: string | null) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  sfvMode?: boolean;
  blueprintMode?: boolean;
  onPortMouseDown?: (
    nodeId: string,
    portId: string,
    signalType: SignalLevel
  ) => void;
  onPortMouseUp?: (
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) => void;
  zoom: number;
  /** World-space viewport (CSS pixels / zoom) for rack snapping in Lab. */
  onViewportWorldSize?: (vw: number, vh: number) => void;
}

const KNOB_DRAG_SENS = 0.35;

function sagControlPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { cp1y: number; cp2y: number } {
  const sag = Math.min(260, 72 + Math.abs(x2 - x1) * 0.55);
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

function cubicAt(a: number, b: number, c: number, d: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
}

function cableDistanceToPoint(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const { cp1y, cp2y } = sagControlPoints(x1, y1, x2, y2);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const bx = cubicAt(x1, x1, x2, x2, t);
    const by = cubicAt(y1, cp1y, cp2y, y2, t);
    const d = Math.hypot(px - bx, py - by);
    if (d < min) min = d;
  }
  return min;
}

function nodeInView(
  x: number,
  y: number,
  w: number,
  h: number,
  vw: number,
  vh: number
): boolean {
  return x + w >= -40 && y + h >= -40 && x <= vw + 40 && y <= vh + 40;
}

type PaintCableOpts = { improperHint?: boolean; nowMs?: number; signalActive?: boolean };

function paintCable(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zoom: number,
  kind: 'mic' | 'line' | 'speaker' | 'digital',
  opts?: PaintCableOpts & { sfvMode?: boolean; db?: number; clipping?: boolean }
): void {
  const z = zoom;
  if (opts?.sfvMode) {
    const db = opts.db ?? -120;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    if (opts.clipping) {
      const flash = (opts.nowMs ?? 0) % 150 < 75;
      ctx.strokeStyle = flash ? '#ff1f1f' : '#7a1111';
      ctx.lineWidth = 2.8 / z;
      drawCablePath(ctx, x1, y1, x2, y2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (db < -90) {
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 0.9 / z;
      drawCablePath(ctx, x1, y1, x2, y2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (db >= -18 && db <= -6) {
      const pulse = 0.7 + 0.3 * Math.sin((opts.nowMs ?? 0) / 120);
      ctx.strokeStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 10 * pulse;
      ctx.lineWidth = 2.8 / z;
      drawCablePath(ctx, x1, y1, x2, y2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (db > -6 && db <= 0) {
      ctx.strokeStyle = '#ff9f1a';
      ctx.shadowColor = '#ff7f00';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.4 / z;
      drawCablePath(ctx, x1, y1, x2, y2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.restore();
  }
  ctx.save();
  if (opts?.improperHint && opts.nowMs != null) {
    const pulse =
      0.4 + 0.22 * Math.sin(opts.nowMs / 185) + 0.12 * Math.sin(opts.nowMs / 263);
    ctx.globalAlpha = Math.max(0.3, Math.min(0.78, pulse));
  }
  if (opts?.signalActive && opts.nowMs != null) {
    const pulse = 0.65 + 0.35 * Math.sin(opts.nowMs / 90);
    ctx.shadowBlur = 10;
    ctx.globalAlpha = Math.max(0.5, pulse);
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  // Cable shadow offset gives a hanging 3D illusion.
  const shadowOffset = 3 / z;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.4 / z;
  ctx.beginPath();
  ctx.moveTo(x1 + shadowOffset, y1 + shadowOffset);
  drawCablePath(
    ctx,
    x1 + shadowOffset,
    y1 + shadowOffset,
    x2 + shadowOffset,
    y2 + shadowOffset
  );
  ctx.stroke();

  if (kind === 'speaker') {
    ctx.setLineDash([]);
    const { cp1y, cp2y } = sagControlPoints(x1, y1, x2, y2);
    const spk = signalColors.speaker;
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.strokeStyle = '#1a0a00';
    ctx.lineWidth = 2.6 / z;
    ctx.beginPath();
    ctx.moveTo(x1 + 0.8, y1 + 1.2);
    ctx.bezierCurveTo(x1 + 0.8, cp1y + 2, x2 + 0.8, cp2y + 2, x2 + 0.8, y2 + 1.2);
    ctx.stroke();
    ctx.strokeStyle = spk;
    ctx.lineWidth = 1.65 / z;
    ctx.beginPath();
    ctx.moveTo(x1 - 0.8, y1 - 1.2);
    ctx.bezierCurveTo(x1 - 0.8, cp1y - 2, x2 - 0.8, cp2y - 2, x2 - 0.8, y2 - 1.2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (opts?.improperHint) ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  ctx.shadowBlur = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  if (kind === 'mic') {
    ctx.strokeStyle = signalColors.mic;
  } else if (kind === 'digital') {
    ctx.strokeStyle = signalColors.digital;
  } else {
    ctx.strokeStyle = signalColors.line;
  }
  ctx.lineWidth = 1.6 / z;
  drawCablePath(ctx, x1, y1, x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (opts?.improperHint) ctx.globalAlpha = 1;
  if (opts?.signalActive) {
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawMiniConsoleUi(
  ctx: CanvasRenderingContext2D,
  node: StudioState['nodes'][number],
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  meterLevel: number
): void {
  const strips = 5;
  const pad = 14 / z;
  const stripW = (w - pad * 2) / (strips + 1.2);
  const top = y + 18 / z;
  const bottom = y + h - 20 / z;
  for (let i = 0; i < strips; i += 1) {
    const sx = x + pad + i * stripW;
    ctx.fillStyle = '#242424';
    ctx.fillRect(sx, top, stripW - 6 / z, h - 40 / z);
    const mute = node.state[`ch-${i + 1}-mute`] === true;
    const solo = node.state[`ch-${i + 1}-solo`] === true;
    const fader = Number(node.state[`ch-${i + 1}-fader`] ?? 70);
    const travel = h - 92 / z;
    const fy = top + 24 / z + ((100 - Math.max(0, Math.min(100, fader))) / 100) * travel;

    ctx.fillStyle = mute ? '#ad2b2b' : '#3a3a3a';
    ctx.fillRect(sx + 3 / z, top + 4 / z, 12 / z, 9 / z);
    ctx.fillStyle = solo ? '#d0a21c' : '#3a3a3a';
    ctx.fillRect(sx + 18 / z, top + 4 / z, 12 / z, 9 / z);

    ctx.fillStyle = '#101010';
    ctx.fillRect(sx + stripW * 0.5 - 1 / z, top + 18 / z, 2 / z, travel + 10 / z);
    ctx.fillStyle = '#d6d6d6';
    ctx.fillRect(sx + stripW * 0.5 - 7 / z, fy, 14 / z, 8 / z);
  }

  const meterX = x + w - stripW * 1.1;
  ctx.fillStyle = '#151515';
  ctx.fillRect(meterX, top, stripW * 0.9, h - 40 / z);
  const levelPct = Math.max(0, Math.min(1, meterLevel));
  const meterH = (h - 60 / z) * levelPct;
  ctx.fillStyle = '#49d16d';
  ctx.fillRect(meterX + 8 / z, bottom - meterH - 12 / z, 8 / z, meterH);
  ctx.fillStyle = '#ffab40';
  ctx.fillRect(meterX + 20 / z, bottom - meterH * 0.8 - 12 / z, 8 / z, meterH * 0.8);
}

function consoleLayout(x: number, y: number, w: number, h: number, z: number) {
  const strips = 5;
  const pad = 14 / z;
  const stripW = (w - pad * 2) / (strips + 1.2);
  const top = y + 18 / z;
  const travel = h - 92 / z;
  return { strips, pad, stripW, top, travel };
}

function findConsoleControlHit(
  wx: number,
  wy: number,
  node: StudioState['nodes'][number],
  w: number,
  h: number,
  z: number
): { type: 'fader' | 'mute' | 'solo'; controlId: string } | null {
  const l = consoleLayout(node.x, node.y, w, h, z);
  for (let i = 0; i < l.strips; i += 1) {
    const idx = i + 1;
    const sx = node.x + l.pad + i * l.stripW;
    const muteRect = { x: sx + 3 / z, y: l.top + 4 / z, w: 12 / z, h: 9 / z };
    const soloRect = { x: sx + 18 / z, y: l.top + 4 / z, w: 12 / z, h: 9 / z };
    const fader = Number(node.state[`ch-${idx}-fader`] ?? 70);
    const fy = l.top + 24 / z + ((100 - Math.max(0, Math.min(100, fader))) / 100) * l.travel;
    const capRect = { x: sx + l.stripW * 0.5 - 8 / z, y: fy - 2 / z, w: 16 / z, h: 12 / z };

    if (wx >= muteRect.x && wx <= muteRect.x + muteRect.w && wy >= muteRect.y && wy <= muteRect.y + muteRect.h) {
      return { type: 'mute', controlId: `ch-${idx}-mute` };
    }
    if (wx >= soloRect.x && wx <= soloRect.x + soloRect.w && wy >= soloRect.y && wy <= soloRect.y + soloRect.h) {
      return { type: 'solo', controlId: `ch-${idx}-solo` };
    }
    if (wx >= capRect.x && wx <= capRect.x + capRect.w && wy >= capRect.y && wy <= capRect.y + capRect.h) {
      return { type: 'fader', controlId: `ch-${idx}-fader` };
    }
  }
  const meterX = node.x + w - l.stripW * 1.1;
  const masterRect = { x: meterX + 6 / z, y: node.y + h - 26 / z, w: 28 / z, h: 12 / z };
  if (
    wx >= masterRect.x &&
    wx <= masterRect.x + masterRect.w &&
    wy >= masterRect.y &&
    wy <= masterRect.y + masterRect.h
  ) {
    return { type: 'fader', controlId: 'master-fader' };
  }
  return null;
}

function findNevePhantomHit(
  wx: number,
  wy: number,
  node: StudioState['nodes'][number],
  z: number
): boolean {
  const btn = {
    x: node.x + 540 / z,
    y: node.y + 10 / z,
    w: 36 / z,
    h: 18 / z,
  };
  return (
    wx >= btn.x &&
    wx <= btn.x + btn.w &&
    wy >= btn.y &&
    wy <= btn.y + btn.h
  );
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

function findSnappedInputPort(
  wx: number,
  wy: number,
  studio: StudioState,
  excludeFromId: string
): { pick: PortPick; anchor: { x: number; y: number } } | null {
  let best: { pick: PortPick; anchor: { x: number; y: number }; dist: number } | null = null;
  for (const node of studio.nodes) {
    if (node.id === excludeFromId) continue;
    const def = equipmentLibrary.find((d) => d.id === node.defId);
    if (!def) continue;
    for (const p of def.inputs) {
      const a = getPortAnchor(node, def, p.id, 'input');
      if (!a) continue;
      const dx = a.x - wx;
      const dy = a.y - wy;
      const dist = Math.hypot(dx, dy);
      if (dist <= 28 && (!best || dist < best.dist)) {
        best = { pick: { nodeId: node.id, portId: p.id, side: 'input', type: p.type }, anchor: a, dist };
      }
    }
  }
  return best ? { pick: best.pick, anchor: best.anchor } : null;
}

function drawStudioCable(
  ctx: CanvasRenderingContext2D,
  conn: Connection,
  studio: StudioState,
  z: number,
  deskNode?: StudioState['nodes'][number] | null,
  viewport?: { w: number; h: number },
  nowMs?: number,
  selected?: boolean,
  inViewNodeIds?: Set<string>,
  sfvMode?: boolean
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
  const meter =
    inViewNodeIds && !inViewNodeIds.has(conn.fromNodeId)
      ? 0
      : audioEngine.getMeterLevel(conn.fromNodeId);
  const db = meter <= 0.00001 ? -120 : 20 * Math.log10(meter);
  const clipping = audioEngine.isNodeClipping(conn.fromNodeId);
  if (selected) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3.4 / z;
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    drawCablePath(ctx, p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }
  paintCable(ctx, p1.x, p1.y, p2.x, p2.y, z, connectionVisualKind(conn), {
    improperHint: improper,
    nowMs,
    signalActive: meter > 0.02,
    sfvMode,
    db,
    clipping,
  });
}

const Renderer: React.FC<RendererProps> = ({
  state,
  onSelectNode,
  onUpdateNode,
  onControlChange,
  onConnect,
  onAddCable,
  selectedCableId,
  onSelectCable,
  onCanvasReady,
  sfvMode,
  blueprintMode,
  onPortMouseDown,
  onPortMouseUp,
  deskNode,
  zoom,
  onViewportWorldSize,
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
  const faderDragRef = useRef<{
    nodeId: string;
    controlId: string;
    laneTop: number;
    laneTravel: number;
  } | null>(null);

  const cableDragRef = useRef<{
    fromNodeId: string;
    fromPortId: string;
    signalType: SignalLevel;
  } | null>(null);
  const cablePreviewRef = useRef<{ x: number; y: number } | null>(null);
  const snappedPortRef = useRef<{ pick: PortPick; anchor: { x: number; y: number } } | null>(null);
  const hoverPortRef = useRef<{ pick: PortPick; x: number; y: number } | null>(null);
  const hoverPortUntilRef = useRef(0);
  const hoverCableIdRef = useRef<string | null>(null);

  const stateRef = useRef(state);
  const zoomRef = useRef(zoom);
  const onUpdateNodeRef = useRef(onUpdateNode);
  const onControlChangeRef = useRef(onControlChange);
  const onConnectRef = useRef(onConnect);
  const onAddCableRef = useRef(onAddCable);
  const selectedCableIdRef = useRef<string | null | undefined>(selectedCableId);
  const onSelectCableRef = useRef(onSelectCable);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const sfvModeRef = useRef(sfvMode);
  const blueprintModeRef = useRef(blueprintMode);
  const onPortMouseDownRef = useRef(onPortMouseDown);
  const onPortMouseUpRef = useRef(onPortMouseUp);
  const deskNodeRef = useRef(deskNode);
  const onViewportWorldSizeRef = useRef(onViewportWorldSize);
  const lastReportedVpRef = useRef({ w: 0, h: 0 });

  stateRef.current = state;
  zoomRef.current = zoom;
  onUpdateNodeRef.current = onUpdateNode;
  onControlChangeRef.current = onControlChange;
  onConnectRef.current = onConnect;
  onAddCableRef.current = onAddCable;
  selectedCableIdRef.current = selectedCableId;
  onSelectCableRef.current = onSelectCable;
  onCanvasReadyRef.current = onCanvasReady;
  sfvModeRef.current = sfvMode;
  blueprintModeRef.current = blueprintMode;
  onPortMouseDownRef.current = onPortMouseDown;
  onPortMouseUpRef.current = onPortMouseUp;
  deskNodeRef.current = deskNode;
  onViewportWorldSizeRef.current = onViewportWorldSize;

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
    onCanvasReadyRef.current?.(canvas);

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
    return () => {
      onCanvasReadyRef.current?.(null);
      ro.disconnect();
    };
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
      if (
        Math.abs(lastReportedVpRef.current.w - vw) > 0.25 ||
        Math.abs(lastReportedVpRef.current.h - vh) > 0.25
      ) {
        lastReportedVpRef.current = { w: vw, h: vh };
        onViewportWorldSizeRef.current?.(vw, vh);
      }

      const zones = getStudioZones(vw, vh);
      ctx.fillStyle = blueprintModeRef.current ? '#0a1628' : '#0d0d0d';
      ctx.fillRect(0, 0, vw, vh);

      ctx.strokeStyle = blueprintModeRef.current
        ? 'rgba(186,221,255,0.11)'
        : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1 / z;
      for (let gx = 0; gx < vw; gx += 50) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, vh);
        ctx.stroke();
      }
      for (let gy = 0; gy < vh; gy += 44) {
        ctx.strokeStyle =
          gy % (44 * 4) === 0
            ? (blueprintModeRef.current
                ? 'rgba(185,220,255,0.16)'
                : 'rgba(255,255,255,0.08)')
            : (blueprintModeRef.current
                ? 'rgba(185,220,255,0.06)'
                : 'rgba(255,255,255,0.025)');
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(vw, gy);
        ctx.stroke();
      }

      drawRackRails(ctx, zones, vh, z);

      if (blueprintModeRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(20,40,72,0.32)';
        ctx.fillRect(0, 0, zones.rackLeft, vh);
        ctx.fillRect(zones.rackRight, 0, vw - zones.rackRight, vh);
        ctx.fillStyle = 'rgba(20,40,72,0.2)';
        ctx.fillRect(zones.rackLeft, 0, zones.rackRight - zones.rackLeft, vh);
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = blueprintModeRef.current
        ? 'rgba(186,221,255,0.28)'
        : 'rgba(232,160,32,0.32)';
      ctx.lineWidth = 1.2 / z;
      ctx.setLineDash([6 / z, 5 / z]);
      ctx.beginPath();
      ctx.moveTo(zones.rackLeft, 0);
      ctx.lineTo(zones.rackLeft, vh);
      ctx.moveTo(zones.rackRight, 0);
      ctx.lineTo(zones.rackRight, vh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = blueprintModeRef.current
        ? 'rgba(186,221,255,0.2)'
        : 'rgba(255,255,255,0.14)';
      ctx.font = `${Math.max(10, 11) / z}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('STAGE', 12 / z, 22 / z);
      ctx.textAlign = 'center';
      ctx.fillStyle = blueprintModeRef.current
        ? 'rgba(186,221,255,0.24)'
        : 'rgba(232,160,32,0.6)';
      ctx.fillText(
        'VERTICAL RACK · 600px',
        (zones.rackLeft + zones.rackRight) * 0.5,
        22 / z
      );
      ctx.textAlign = 'left';
      ctx.restore();

      const inViewNodeIds = new Set<string>();
      st.nodes.forEach((n) => {
        const d = equipmentLibrary.find((ed) => ed.id === n.defId);
        if (!d) return;
        const h = d.heightUnits > 0 ? d.heightUnits * 44 : 100;
        if (nodeInView(n.x, n.y, d.width, h, vw, vh)) {
          inViewNodeIds.add(n.id);
        }
      });

      ctx.setLineDash([]);
      const nowMs = performance.now();
      st.connections.forEach((conn) => {
        drawStudioCable(
          ctx,
          conn,
          st,
          z,
          deskNodeRef.current,
          { w: vw, h: vh },
          nowMs,
          conn.id === selectedCableIdRef.current || conn.id === hoverCableIdRef.current,
          inViewNodeIds,
          sfvModeRef.current
        );
      });

      st.nodes.forEach((node) => {
        const def = equipmentLibrary.find((d) => d.id === node.defId);
        if (!def) return;
        const nodeH = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
        const inView = nodeInView(node.x, node.y, def.width, nodeH, vw, vh);
        const nodeLevel = inView ? audioEngine.getMeterLevel(node.id) : 0;

        renderEquipmentGraphics({
          ctx,
          x: node.x,
          y: node.y,
          w: def.width,
          h: nodeH,
          zoom: z,
          node,
          isSelected: node.id === st.selectedNodeId,
        });

        if (def.id === 'professional-mixer-console') {
          drawMiniConsoleUi(ctx, node, node.x, node.y, def.width, nodeH, z, nodeLevel);
        }
        if (def.id === '1176-peak-limiter') {
          ctx.save();
          ctx.fillStyle = '#cfd2d8';
          ctx.fillRect(node.x + 18 / z, node.y + 10 / z, def.width - 36 / z, nodeH - 20 / z);
          ctx.strokeStyle = '#666a73';
          ctx.lineWidth = 1 / z;
          ctx.strokeRect(node.x + 18 / z, node.y + 10 / z, def.width - 36 / z, nodeH - 20 / z);
          ctx.fillStyle = '#2a2e37';
          ctx.fillRect(node.x + def.width - 78 / z, node.y + 16 / z, 54 / z, 22 / z);
          ctx.restore();
        }
        if (def.id === 'la-2a-leveling') {
          ctx.save();
          ctx.fillStyle = '#b8bbc2';
          ctx.fillRect(node.x + 14 / z, node.y + 10 / z, def.width - 28 / z, nodeH - 20 / z);
          ctx.strokeStyle = '#6a6f77';
          ctx.lineWidth = 1 / z;
          ctx.strokeRect(node.x + 14 / z, node.y + 10 / z, def.width - 28 / z, nodeH - 20 / z);
          ctx.restore();
        }
        if (
          def.id === 'neve-1073' ||
          def.id === 'ssl-bus-comp' ||
          def.id === 'professional-mixer-console'
        ) {
          const meterX = node.x + def.width - 34 / z;
          const meterY = node.y + 8 / z;
          ctx.save();
          ctx.fillStyle = 'rgba(40,30,16,0.9)';
          ctx.shadowColor = nodeLevel > 0.01 ? 'rgba(255,190,90,0.7)' : 'transparent';
          ctx.shadowBlur = nodeLevel > 0.01 ? 10 : 0;
          ctx.fillRect(meterX, meterY, 26 / z, 16 / z);
          const needle = -Math.PI * 0.8 + nodeLevel * Math.PI * 0.8;
          ctx.translate(meterX + 13 / z, meterY + 14 / z);
          ctx.rotate(needle);
          ctx.strokeStyle = '#f0d2a2';
          ctx.lineWidth = 1 / z;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(9 / z, 0);
          ctx.stroke();
          ctx.restore();
          if (audioEngine.isNodeClipping(node.id)) {
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = '#ff3b30';
            ctx.shadowColor = '#ff3b30';
            ctx.shadowBlur = 8;
            ctx.arc(meterX + 23 / z, meterY + 3 / z, 2 / z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        if (
          def.heightUnits > 0 &&
          isRackGearInVerticalBay(node.x, def.width, zones)
        ) {
          let ledColor = '#68ff7a';
          if (def.brand.toLowerCase().includes('ssl')) ledColor = '#ff4242';
          if (def.brand.toLowerCase().includes('neve')) ledColor = '#ffbe3b';
          if (def.id === 'sig-gen-pro') ledColor = '#68ff7a';
          ctx.save();
          ctx.beginPath();
          ctx.fillStyle =
            audioEngine.audioContext?.state === 'running'
              ? ledColor
              : 'rgba(60,60,60,0.7)';
          ctx.shadowColor = ledColor;
          ctx.shadowBlur = audioEngine.audioContext?.state === 'running' ? 8 : 0;
          ctx.arc(node.x + 8 / z, node.y + 8 / z, 2.4 / z, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (def.id === 'neve-1073') {
          const phantomOn =
            node.state.phantomPower === true || node.state.phantom === true;
          const px = node.x + 540 / z;
          const py = node.y + 10 / z;
          ctx.save();
          ctx.fillStyle = phantomOn ? '#f8d24a' : '#3a3222';
          ctx.strokeStyle = '#9e8650';
          ctx.lineWidth = 1 / z;
          ctx.shadowColor = phantomOn ? '#f8d24a' : 'transparent';
          ctx.shadowBlur = phantomOn ? 8 : 0;
          ctx.fillRect(px, py, 36 / z, 18 / z);
          ctx.strokeRect(px, py, 36 / z, 18 / z);
          ctx.fillStyle = '#111';
          ctx.font = `${8 / z}px sans-serif`;
          ctx.fillText('+48V', px + 6 / z, py + 12 / z);
          ctx.restore();
        }
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
            const snap = findSnappedInputPort(
              preview.x,
              preview.y,
              st,
              drag.fromNodeId
            );
            snappedPortRef.current = snap;
            const tip = snap?.anchor ?? preview;
            let previewImproper = false;
            if ((hoverPick || snap?.pick) && drag.signalType === 'mic') {
              const hp = snap?.pick ?? hoverPick!;
              const toN =
                st.nodes.find((n) => n.id === hp.nodeId) ??
                (deskNodeRef.current?.id === hp.nodeId
                  ? deskNodeRef.current
                  : undefined);
              const toD = toN
                ? equipmentLibrary.find((d) => d.id === toN.defId)
                : undefined;
              const toPort = toD?.inputs.find((p) => p.id === hp.portId);
              if (
                toD &&
                toPort?.type === 'line' &&
                toD.category !== 'preamp'
              ) {
                previewImproper = true;
              }
            }
            ctx.setLineDash([6 / z, 4 / z]);
            paintCable(ctx, a.x, a.y, tip.x, tip.y, z, kind, {
              improperHint: previewImproper,
              nowMs,
            });
            ctx.setLineDash([]);
            if (snap) {
              const glow =
                snap.pick.type === 'mic'
                  ? signalColors.mic
                  : snap.pick.type === 'speaker'
                    ? signalColors.speaker
                    : snap.pick.type === 'digital'
                      ? signalColors.digital
                      : signalColors.line;
              ctx.save();
              ctx.strokeStyle = glow;
              ctx.globalAlpha = 0.92;
              ctx.lineWidth = 1.4 / z;
              ctx.shadowColor = glow;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(snap.anchor.x, snap.anchor.y, 7 / z, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      } else {
        snappedPortRef.current = null;
      }

      if (hoverPortRef.current || hoverPortUntilRef.current > nowMs) {
        const hp = hoverPortRef.current;
        if (hp) {
          const bgW = 124 / z;
          const bgH = 18 / z;
          const px = hp.x + 10 / z;
          const py = hp.y - 20 / z;
          ctx.save();
          ctx.fillStyle = 'rgba(12,12,12,0.88)';
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1 / z;
          ctx.fillRect(px, py, bgW, bgH);
          ctx.strokeRect(px, py, bgW, bgH);
          ctx.fillStyle = '#f2f2f2';
          ctx.font = `${10 / z}px monospace`;
          ctx.fillText(
            `${hp.pick.portId} - ${hp.pick.type.toUpperCase()}`,
            px + 6 / z,
            py + 12 / z
          );
          ctx.restore();
        }
      }

      ctx.restore();
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [zoom]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const { x, y } = getWorldPoint(e.clientX, e.clientY);
      if (cableDragRef.current) {
        cablePreviewRef.current = { x, y };
      } else {
        let foundPort = false;
        hoverCableIdRef.current = null;
        for (const node of [...stateRef.current.nodes].reverse()) {
          const def = equipmentLibrary.find((d) => d.id === node.defId);
          if (!def) continue;
          const hit = hitTestAnyPort(x, y, node, def);
          if (hit) {
            const a = getPortAnchor(node, def, hit.portId, hit.side);
            if (a) {
              hoverPortRef.current = { pick: hit, x: a.x, y: a.y };
              hoverPortUntilRef.current = performance.now() + 1000;
              foundPort = true;
            }
            break;
          }
        }
        if (!foundPort && hoverPortUntilRef.current <= performance.now()) {
          hoverPortRef.current = null;
        }
        if (!foundPort) {
          for (const conn of [...stateRef.current.connections].reverse()) {
            const fromNode = stateRef.current.nodes.find((n) => n.id === conn.fromNodeId);
            const toNode = stateRef.current.nodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) continue;
            const fromDef = equipmentLibrary.find((d) => d.id === fromNode.defId);
            const toDef = equipmentLibrary.find((d) => d.id === toNode.defId);
            if (!fromDef || !toDef) continue;
            const p1 = getPortAnchor(fromNode, fromDef, conn.fromPortId, 'output');
            const p2 = getPortAnchor(toNode, toDef, conn.toPortId, 'input');
            if (!p1 || !p2) continue;
            if (cableDistanceToPoint(x, y, p1.x, p1.y, p2.x, p2.y) <= 10 / zoomRef.current) {
              hoverCableIdRef.current = conn.id;
              break;
            }
          }
        }
        if (canvasRef.current) {
          canvasRef.current.style.cursor =
            hoverCableIdRef.current != null ? 'pointer' : 'crosshair';
        }
      }

      const fd = faderDragRef.current;
      if (fd && onControlChangeRef.current) {
        const laneBottom = fd.laneTop + fd.laneTravel;
        const clampedY = Math.max(fd.laneTop, Math.min(laneBottom, y));
        const pct = 1 - (clampedY - fd.laneTop) / Math.max(1, fd.laneTravel);
        onControlChangeRef.current(fd.nodeId, fd.controlId, Math.round(pct * 100));
        return;
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

    const onUp = (e: PointerEvent) => {
      const cd = cableDragRef.current;
      if (cd && (onConnectRef.current || onAddCableRef.current)) {
        const { x, y } = getWorldPoint(e.clientX, e.clientY);
        const { h: lh } = logicalSizeRef.current;
        const vh = lh / zoomRef.current;
        let target: PortPick | null = null;
        const desk = deskNodeRef.current;
        if (desk && y >= vh * 0.5) {
          const deskDef = equipmentLibrary.find((d) => d.id === desk.defId);
          if (deskDef) {
            target = hitTestAnyPort(x, y, desk, deskDef, {
              x: (logicalSizeRef.current.w / zoomRef.current - deskDef.width) / 2,
              y: vh * 0.5,
              width: deskDef.width,
              height: vh * 0.5,
            });
            if (target && target.side !== 'input') target = null;
          }
        }
        const snapped = snappedPortRef.current;
        if (snapped) {
          target = snapped.pick;
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
        if (
          target &&
          target.side === 'input' &&
          target.nodeId !== cd.fromNodeId
        ) {
          onPortMouseUpRef.current?.(
            cd.fromNodeId,
            cd.fromPortId,
            target.nodeId,
            target.portId
          );
          const addCable = onAddCableRef.current ?? onConnectRef.current;
          addCable?.(
            cd.fromNodeId,
            cd.fromPortId,
            target.nodeId,
            target.portId
          );
        }
      }
      cableDragRef.current = null;
      cablePreviewRef.current = null;
      snappedPortRef.current = null;

      dragRef.current = null;
      knobDragRef.current = null;
      faderDragRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [getWorldPoint]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
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
          onPortMouseDownRef.current?.(
            deskPortHit.nodeId,
            deskPortHit.portId,
            deskPortHit.type
          );
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
    faderDragRef.current = null;
    cableDragRef.current = null;
    cablePreviewRef.current = { x, y };

    let cablePicked = false;
    for (const conn of [...stateRef.current.connections].reverse()) {
      const fromNode = stateRef.current.nodes.find((n) => n.id === conn.fromNodeId);
      const toNode = stateRef.current.nodes.find((n) => n.id === conn.toNodeId);
      if (!fromNode || !toNode) continue;
      const fromDef = equipmentLibrary.find((d) => d.id === fromNode.defId);
      const toDef = equipmentLibrary.find((d) => d.id === toNode.defId);
      if (!fromDef || !toDef) continue;
      const p1 = getPortAnchor(fromNode, fromDef, conn.fromPortId, 'output');
      const p2 = getPortAnchor(toNode, toDef, conn.toPortId, 'input');
      if (!p1 || !p2) continue;
      const dist = cableDistanceToPoint(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist <= 12 / zoomRef.current) {
        onSelectCableRef.current?.(conn.id);
        dragRef.current = null;
        cablePicked = true;
        break;
      }
    }
    if (cablePicked) return;
    onSelectCableRef.current?.(null);

    for (const node of [...stateRef.current.nodes].reverse()) {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) continue;
      const portHit = hitTestAnyPort(x, y, node, def);
      if (portHit?.side === 'output') {
        onPortMouseDownRef.current?.(
          portHit.nodeId,
          portHit.portId,
          portHit.type
        );
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
      if (def.id === 'neve-1073' && findNevePhantomHit(x, y, node, zoomRef.current)) {
        onSelectNode(node.id);
        const current = node.state.phantomPower === true || node.state.phantom === true;
        onControlChangeRef.current?.(node.id, 'phantomPower', !current);
        return;
      }
      if (def.id === 'professional-mixer-console') {
        const nodeH = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
        const hit = findConsoleControlHit(x, y, node, def.width, nodeH, zoomRef.current);
        if (hit) {
          onSelectNode(node.id);
          if (hit.type === 'fader') {
            const l = consoleLayout(node.x, node.y, def.width, nodeH, zoomRef.current);
            faderDragRef.current = {
              nodeId: node.id,
              controlId: hit.controlId,
              laneTop: l.top + 24 / zoomRef.current,
              laneTravel: l.travel,
            };
          } else {
            const current = node.state[hit.controlId] === true;
            onControlChangeRef.current?.(node.id, hit.controlId, !current);
          }
          dragRef.current = null;
          knobDragRef.current = null;
          return;
        }
      }
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

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handleCanvasPointerDown}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      className="h-full w-full cursor-crosshair bg-[#121212] touch-none"
    />
  );
};

export default Renderer;
