/**
 * Photorealistic rack & floor equipment rendering + rack snapping + control hit-testing.
 */

import type { EquipmentNode } from '../../../shared/equipment-types';
import type { EquipmentDef, SignalLevel } from '@/lib/equipment-library';
import { equipmentLibrary } from '@/lib/equipment-library';

export interface GraphicsContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
  node: EquipmentNode;
  isSelected?: boolean;
}

export const RACK_RAIL_X = [300, 900] as const;

/** All rack-mount gear (heightUnits &gt; 0) snaps to 1U grid and left/right bay between rails. */
export function snapRackNodePosition(
  x: number,
  y: number,
  width: number,
  heightUnits: number
): { x: number; y: number } {
  if (heightUnits <= 0) return { x, y };
  const fy = Math.round(y / 44) * 44;
  const leftSnap = RACK_RAIL_X[0] + 8;
  const rightSnap = RACK_RAIL_X[1] - width - 8;
  const fx =
    Math.abs(x - leftSnap) <= Math.abs(x - rightSnap) ? leftSnap : rightSnap;
  return { x: fx, y: fy };
}

export function drawRackRails(
  ctx: CanvasRenderingContext2D,
  vh: number,
  _zoom: number
): void {
  const stripW = 6;
  for (const rx of RACK_RAIL_X) {
    const g = ctx.createLinearGradient(rx, 0, rx + stripW, 0);
    g.addColorStop(0, '#2a2a2a');
    g.addColorStop(0.4, '#5a5a5a');
    g.addColorStop(0.55, '#3a3a3a');
    g.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = g;
    ctx.fillRect(rx - stripW / 2, 0, stripW, vh);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(rx - stripW / 2, 0);
    ctx.lineTo(rx - stripW / 2, vh);
    ctx.moveTo(rx + stripW / 2, 0);
    ctx.lineTo(rx + stripW / 2, vh);
    ctx.stroke();
  }
}

export type ControlHit =
  | {
      kind: 'knob';
      nodeId: string;
      controlId: string;
      min: number;
      max: number;
      value: number;
    }
  | {
      kind: 'switch';
      nodeId: string;
      controlId: string;
      value: boolean;
    }
  | { kind: 'ratio'; nodeId: string; value: number };

function numState(n: EquipmentNode, key: string, fallback: number): number {
  const v = n.state?.[key];
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

function boolState(n: EquipmentNode, key: string, fallback: boolean): boolean {
  const v = n.state?.[key];
  return typeof v === 'boolean' ? v : fallback;
}

function ratio1176(n: EquipmentNode): number {
  const v = n.state?.ratio;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseInt(v, 10) || 4;
  return 4;
}

function controlDef(def: EquipmentDef, id: string) {
  return def.controls.find((c) => c.id === id);
}

function knobAngle(min: number, max: number, value: number): number {
  const t = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, t));
  return -0.75 * Math.PI + clamped * 1.5 * Math.PI;
}

/** Neve Marconi gain: 12 detented positions. */
function marconiGainAngle(min: number, max: number, value: number): number {
  const steps = 12;
  const t = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, t));
  const step = Math.round(clamped * (steps - 1));
  const snapped = step / (steps - 1);
  return -0.75 * Math.PI + snapped * 1.5 * Math.PI;
}

function drawMarconiGainTicks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 12; i++) {
    const a = -0.75 * Math.PI + (i / 11) * 1.5 * Math.PI;
    const x0 = Math.cos(a) * (r + 2);
    const y0 = Math.sin(a) * (r + 2);
    const x1 = Math.cos(a) * (r + 6);
    const y1 = Math.sin(a) * (r + 6);
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Outer grey skirt + inner colored cap (classic concentric EQ stack). */
function drawConcentricEqKnob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  innerBlue: boolean
): void {
  const outerR = 14;
  const innerR = 9;
  ctx.save();
  ctx.translate(cx, cy);
  const skirt = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR);
  skirt.addColorStop(0, '#6a6a6a');
  skirt.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = skirt;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();

  if (innerBlue) {
    const ib = ctx.createRadialGradient(-2, -2, 0, 0, 0, innerR);
    ib.addColorStop(0, '#5a8ec8');
    ib.addColorStop(1, '#1a3050');
    ctx.fillStyle = ib;
  } else {
    const ig = ctx.createRadialGradient(-2, -2, 0, 0, 0, innerR);
    ig.addColorStop(0, '#9a9a9a');
    ig.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = ig;
  }
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (innerR - 1), Math.sin(angle) * (innerR - 1));
  ctx.stroke();
  ctx.restore();
}

function drawBrushedFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string
): void {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < w; i += 2) {
    ctx.fillStyle = i % 4 === 0 ? '#fff' : '#000';
    ctx.fillRect(x + i, y, 1, h);
  }
  ctx.restore();

  const u = 44;
  for (let y0 = y; y0 < y + h; y0 += u) {
    const segBottom = Math.min(y0 + u, y + h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x, y0, w, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(x, segBottom - 1, w, 1);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawKnobAt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  angle: number,
  style: 'marconi' | 'bakelite' | 'silver' | 'blue'
): void {
  ctx.save();
  ctx.translate(cx, cy);
  let g: CanvasGradient;
  if (style === 'marconi') {
    g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
    g.addColorStop(0, '#e84848');
    g.addColorStop(0.6, '#a01818');
    g.addColorStop(1, '#501010');
  } else if (style === 'blue') {
    g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
    g.addColorStop(0, '#4a7ab8');
    g.addColorStop(1, '#1a3050');
  } else if (style === 'silver') {
    g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
    g.addColorStop(0, '#e8e8e8');
    g.addColorStop(0.5, '#a8a8a8');
    g.addColorStop(1, '#606060');
  } else {
    g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r);
    g.addColorStop(0, '#2a2a2a');
    g.addColorStop(1, '#0a0a0a');
  }
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const hlR = Math.max(1.8, r * 0.22);
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.36, r * 0.38, Math.PI * 1.05, Math.PI * 1.72);
  ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  ctx.lineWidth = hlR;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.strokeStyle = style === 'silver' ? '#333' : '#ddd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * r * 0.85, Math.sin(angle) * r * 0.85);
  ctx.stroke();
  ctx.restore();
}

function draw1176Vu(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  needle: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.fill();
  ctx.fillStyle = '#fff8e0';
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 2);
  ctx.fill();
  const ang = -Math.PI * 0.65 + needle * Math.PI * 0.55;
  ctx.strokeStyle = '#8b0000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.15);
  ctx.lineTo(Math.cos(ang) * (h * 0.35), Math.sin(ang) * (h * 0.35) + h * 0.1);
  ctx.stroke();
  ctx.restore();
}

// ─── Neve 1073 ───
function renderNeve1073(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  const raf = '#4a5b6d';
  drawBrushedFace(ctx, x, y, w, h, raf);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 11px "Helvetica Neue", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('1073', x + w - 52, y + 16);

  const lib = equipmentLibrary.find((e) => e.id === 'neve-1073')!;
  const g = controlDef(lib, 'gain')!;
  const gainV = numState(node, 'gain', g.default as number);
  const gcx = x + 52;
  const gcy = y + h / 2;
  drawMarconiGainTicks(ctx, gcx, gcy, 16);
  drawKnobAt(
    ctx,
    gcx,
    gcy,
    16,
    marconiGainAngle(g.min ?? 20, g.max ?? 80, gainV),
    'marconi'
  );

  const hi = controlDef(lib, 'high-shelf')!;
  const mid = controlDef(lib, 'mid-freq')!;
  const lo = controlDef(lib, 'low-shelf')!;
  drawConcentricEqKnob(
    ctx,
    x + 175,
    y + h / 2,
    knobAngle(hi.min ?? -15, hi.max ?? 15, numState(node, 'high-shelf', 0)),
    true
  );
  drawConcentricEqKnob(
    ctx,
    x + 255,
    y + h / 2,
    knobAngle(mid.min ?? 0.36, mid.max ?? 7.2, numState(node, 'mid-freq', 1.6)),
    true
  );
  drawConcentricEqKnob(
    ctx,
    x + 335,
    y + h / 2,
    knobAngle(lo.min ?? -15, lo.max ?? 15, numState(node, 'low-shelf', 0)),
    false
  );

  ctx.fillStyle = '#8899aa';
  ctx.font = '8px sans-serif';
  ctx.fillText('GAIN', x + 38, y + h - 6);
  ctx.fillText('HI', x + 165, y + h - 6);
  ctx.fillText('MID', x + 245, y + h - 6);
  ctx.fillText('LO', x + 325, y + h - 6);

  const ph = boolState(node, 'phantom', false);
  ctx.fillStyle = ph ? '#E8A020' : '#333';
  ctx.fillRect(x + 420, y + h / 2 - 8, 28, 16);
  ctx.fillStyle = '#ccc';
  ctx.font = '7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('48V', x + 434, y + h / 2 + 3);
  ctx.textAlign = 'left';
}

// ─── API 512c ───
function renderApi512c(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  drawBrushedFace(ctx, x, y, w, h, '#1c1c1c');

  ctx.fillStyle = '#0054a6';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('API', x + w / 2, y + 22);
  ctx.fillStyle = '#888';
  ctx.font = '8px sans-serif';
  ctx.fillText('512c', x + w / 2, y + 32);

  const g = controlDef(
    equipmentLibrary.find((e) => e.id === 'api-512c')!,
    'gain'
  )!;
  const gv = numState(node, 'gain', g.default as number);
  const colX = x + w - 72;
  let cy = y + 48;
  drawKnobAt(
    ctx,
    colX,
    cy,
    14,
    knobAngle(g.min ?? 0, g.max ?? 65, gv),
    'silver'
  );
  ctx.fillStyle = '#aaa';
  ctx.font = '7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAIN', colX, cy + 24);
  cy += 52;
  ctx.fillStyle = boolState(node, 'pad', false) ? '#0054a6' : '#444';
  ctx.fillRect(colX - 14, cy - 10, 28, 20);
  ctx.fillStyle = '#ccc';
  ctx.fillText('PAD', colX, cy + 4);
  cy += 40;
  ctx.fillStyle = boolState(node, 'phantom', false) ? '#0054a6' : '#444';
  ctx.fillRect(colX - 14, cy - 10, 28, 20);
  ctx.fillStyle = '#ccc';
  ctx.fillText('48V', colX, cy + 4);
  ctx.textAlign = 'left';
}

// ─── UREI 1176 ───
function renderUrei1176(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  drawBrushedFace(ctx, x, y, w, h, '#151515');

  const def = equipmentLibrary.find((e) => e.id === 'urei-1176')!;
  const inC = controlDef(def, 'input')!;
  const outC = controlDef(def, 'output')!;
  const attC = controlDef(def, 'attack')!;
  const relC = controlDef(def, 'release')!;

  drawKnobAt(
    ctx,
    x + 70,
    y + 36,
    22,
    knobAngle(inC.min ?? 0, inC.max ?? 100, numState(node, 'input', 30)),
    'silver'
  );
  drawKnobAt(
    ctx,
    x + 70,
    y + 100,
    22,
    knobAngle(outC.min ?? 0, outC.max ?? 100, numState(node, 'output', 24)),
    'silver'
  );
  ctx.fillStyle = '#888';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INPUT', x + 70, y + 130);
  ctx.fillText('OUTPUT', x + 70, y + 142);

  const gr =
    (numState(node, 'input', 30) + numState(node, 'output', 24)) / 200;
  draw1176Vu(ctx, x + w / 2 - 20, y + h / 2 - 4, 72, 56, gr);

  drawKnobAt(
    ctx,
    x + w - 160,
    y + 36,
    12,
    knobAngle(attC.min ?? 1, attC.max ?? 7, numState(node, 'attack', 3)),
    'bakelite'
  );
  drawKnobAt(
    ctx,
    x + w - 160,
    y + 76,
    12,
    knobAngle(relC.min ?? 1, relC.max ?? 7, numState(node, 'release', 4)),
    'bakelite'
  );
  ctx.fillStyle = '#666';
  ctx.font = '7px sans-serif';
  ctx.fillText('ATT', x + w - 160, y + 96);
  ctx.fillText('REL', x + w - 160, y + 106);

  const ratios = [4, 8, 12, 20];
  const cur = ratio1176(node);
  let by = y + 28;
  for (let i = 0; i < 4; i++) {
    const on = cur === ratios[i];
    ctx.fillStyle = on ? '#c0392b' : '#2a2a2a';
    ctx.fillRect(x + w - 56, by, 40, 14);
    ctx.fillStyle = on ? '#fff' : '#777';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(ratios[i]), x + w - 36, by + 11);
    by += 18;
  }
  ctx.textAlign = 'left';

  ctx.fillStyle = '#555';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('1176LN', x + 12, y + 18);
}

// ─── Pultec EQP-1A — “Pultec trick” low band + CPS dial ───
function renderPultec(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  const navy = '#1b263b';
  drawBrushedFace(ctx, x, y, w, h, navy);

  ctx.fillStyle = 'rgba(255,240,220,0.9)';
  ctx.font = 'bold 11px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.fillText('PULTEC', x + 14, y + 20);
  ctx.font = '9px sans-serif';
  ctx.fillText('EQP-1A Program Equalizer', x + 14, y + 34);

  const def = equipmentLibrary.find((e) => e.id === 'pultec-eqp1a')!;

  const bl = controlDef(def, 'boost-low')!;
  const al = controlDef(def, 'atten-low')!;
  const bLv = numState(node, 'boost-low', bl.default as number);
  const aLv = numState(node, 'atten-low', al.default as number);
  const lowR = 28;
  drawKnobAt(
    ctx,
    x + 62,
    y + h * 0.48,
    lowR,
    knobAngle(bl.min ?? 0, bl.max ?? 10, bLv),
    'bakelite'
  );
  drawKnobAt(
    ctx,
    x + 178,
    y + h * 0.48,
    lowR,
    knobAngle(al.min ?? 0, al.max ?? 10, aLv),
    'bakelite'
  );
  ctx.fillStyle = 'rgba(200,190,170,0.85)';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOW BOOST', x + 62, y + h * 0.48 + 42);
  ctx.fillText('LOW ATTEN', x + 178, y + h * 0.48 + 42);

  const lf = controlDef(def, 'low-freq')!;
  const lfV = numState(node, 'low-freq', lf.default as number);
  const cpsCx = x + 120;
  const cpsCy = y + h * 0.82;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const a = -0.85 * Math.PI + (i / 6) * 1.1 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cpsCx + Math.cos(a) * 26, cpsCy + Math.sin(a) * 26);
    ctx.lineTo(cpsCx + Math.cos(a) * 32, cpsCy + Math.sin(a) * 32);
    ctx.stroke();
  }
  drawKnobAt(
    ctx,
    cpsCx,
    cpsCy,
    18,
    knobAngle(lf.min ?? 20, lf.max ?? 100, lfV),
    'bakelite'
  );
  ctx.fillStyle = 'rgba(200,190,170,0.9)';
  ctx.font = 'bold 8px sans-serif';
  ctx.fillText('CPS', cpsCx, cpsCy + 34);

  const bh = controlDef(def, 'boost-high')!;
  const ah = controlDef(def, 'atten-high')!;
  const hf = controlDef(def, 'high-freq')!;
  const bw = controlDef(def, 'bandwidth')!;
  drawKnobAt(
    ctx,
    x + 320,
    y + 36,
    14,
    knobAngle(bh.min ?? 0, bh.max ?? 10, numState(node, 'boost-high', 0)),
    'bakelite'
  );
  drawKnobAt(
    ctx,
    x + 400,
    y + 36,
    14,
    knobAngle(ah.min ?? 0, ah.max ?? 10, numState(node, 'atten-high', 0)),
    'bakelite'
  );
  drawKnobAt(
    ctx,
    x + 360,
    y + 92,
    12,
    knobAngle(hf.min ?? 3, hf.max ?? 16, numState(node, 'high-freq', 5)),
    'silver'
  );
  drawKnobAt(
    ctx,
    x + 440,
    y + 92,
    12,
    knobAngle(bw.min ?? 1, bw.max ?? 10, numState(node, 'bandwidth', 5)),
    'bakelite'
  );
  ctx.font = '7px sans-serif';
  ctx.fillStyle = 'rgba(180,170,150,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('HF BOOST', x + 320, y + 58);
  ctx.fillText('HF ATTEN', x + 400, y + 58);
  ctx.fillText('KCS', x + 360, y + 112);
  ctx.fillText('BW', x + 440, y + 112);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#b8b8a8';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + w - 72 + i * 20, y + h - 22, 14, 8);
  }
}

// ─── Microphones ───
function renderU87(gc: GraphicsContext): void {
  const { ctx, x, y, w, h } = gc;
  const cx = x + w / 2;
  const bodyTop = y + h * 0.35;
  const champagne = '#c4a574';
  const g = ctx.createLinearGradient(cx - 20, bodyTop, cx + 20, y + h);
  g.addColorStop(0, '#e8d4b0');
  g.addColorStop(0.5, champagne);
  g.addColorStop(1, '#8a7048');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(cx - 22, bodyTop, 44, h * 0.58, [6, 6, 14, 14]);
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.roundRect(cx - 28, y + 8, 56, h * 0.32, [22, 22, 4, 4]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  for (let i = -20; i < 20; i += 4) {
    ctx.beginPath();
    ctx.moveTo(cx + i, y + 14);
    ctx.lineTo(cx + i + 2, y + h * 0.28);
    ctx.stroke();
  }
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - 3, y + h * 0.78, 6, h * 0.12);
}

function renderSM57(gc: GraphicsContext): void {
  const { ctx, x, y, w, h } = gc;
  const cx = x + w / 2;
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.roundRect(cx - 8, y + h * 0.22, 16, h * 0.68, [3, 3, 8, 8]);
  ctx.fill();

  const sg = ctx.createLinearGradient(cx - 10, y, cx + 10, y + h * 0.25);
  sg.addColorStop(0, '#d0d0d0');
  sg.addColorStop(0.5, '#888');
  sg.addColorStop(1, '#555');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.roundRect(cx - 10, y + 4, 20, h * 0.22, [10, 10, 2, 2]);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  for (let i = -6; i < 6; i += 3) {
    ctx.beginPath();
    ctx.moveTo(cx + i, y + 8);
    ctx.lineTo(cx + i + 1, y + h * 0.2);
    ctx.stroke();
  }
}

// ─── SSL 4000 G+ — eight channel strips (simplified photorealistic) ───
function renderSsl4000gConsole(gc: GraphicsContext): void {
  const { ctx, x, y, w, h } = gc;
  drawBrushedFace(ctx, x, y, w, h, '#2d2d2d');

  ctx.fillStyle = '#c0c0c0';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SSL 4000 G+', x + 14, y + 20);
  ctx.fillStyle = '#888';
  ctx.font = '8px sans-serif';
  ctx.fillText('E-Series channel module × 8', x + 14, y + 32);

  const strips = 8;
  const margin = 10;
  const stripW = (w - margin * 2) / strips;
  const eqColors = ['#1a1a1a', '#4a3020', '#1e4a7a', '#1a5c32'];
  const dbMarks = ['+10', '+5', '0', '5', '10', '20', '∞'];

  for (let i = 0; i < strips; i++) {
    const x0 = x + margin + i * stripW;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(x0 + 2, y + 42, stripW - 6, h - 52);

    ctx.fillStyle = '#666';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x0 + stripW / 2, y + 56);

    const rowY = y + 68;
    for (let b = 0; b < 4; b++) {
      const kx = x0 + 10 + b * ((stripW - 20) / 3.2);
      const ky = rowY;
      const ang = -0.75 * Math.PI + (0.15 + b * 0.12) * 1.5 * Math.PI;
      ctx.save();
      ctx.translate(kx, ky);
      const g = ctx.createRadialGradient(-2, -2, 0, 0, 0, 7);
      g.addColorStop(0, eqColors[b]);
      g.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 5.5, Math.sin(ang) * 5.5);
      ctx.stroke();
      ctx.restore();
    }

    const fx = x0 + stripW / 2;
    const slotTop = y + 100;
    const slotH = h - slotTop - 36;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(fx - 5, slotTop, 10, slotH);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(fx - 5, slotTop, 10, slotH);

    ctx.font = '6px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#777';
    for (let m = 0; m < dbMarks.length; m++) {
      const ty = slotTop + 6 + (m / (dbMarks.length - 1)) * (slotH - 12);
      ctx.fillText(dbMarks[m], fx - 10, ty + 3);
      ctx.beginPath();
      ctx.moveTo(fx - 7, ty);
      ctx.lineTo(fx - 5, ty);
      ctx.strokeStyle = '#555';
      ctx.stroke();
    }

    const faderPos = 0.35;
    const capY = slotTop + faderPos * (slotH - 18);
    const capW = 24;
    const capH = 14;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(fx - 12, capY, capW, capH, 2);
    ctx.clip();
    const capGrad = ctx.createLinearGradient(fx, capY, fx, capY + capH);
    capGrad.addColorStop(0, '#fefefe');
    capGrad.addColorStop(0.35, '#e6e6e6');
    capGrad.addColorStop(0.55, '#d0d0d0');
    capGrad.addColorStop(1, '#a8a8a8');
    ctx.fillStyle = capGrad;
    ctx.fillRect(fx - 12, capY, capW, capH);
    ctx.restore();
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(fx - 12, capY, capW, capH, 2);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VCA', fx, capY + 9);
  }
  ctx.textAlign = 'left';
}

// ─── Consoles (simplified strips) ───
function renderConsoleStrip(
  gc: GraphicsContext,
  face: string,
  accent: string,
  label: string,
  channels: number
): void {
  const { ctx, x, y, w, h } = gc;
  drawBrushedFace(ctx, x, y, w, h, face);
  ctx.fillStyle = accent;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(label, x + 12, y + 18);
  const chW = Math.min(48, (w - 24) / Math.min(channels, 16));
  for (let i = 0; i < Math.min(channels, 16); i++) {
    const cx = x + 16 + i * chW;
    ctx.fillStyle = '#333';
    ctx.fillRect(cx, y + 40, chW - 6, h - 52);
    ctx.fillStyle = accent;
    ctx.fillRect(cx + chW / 2 - 2, y + h - 36, 4, 22);
  }
}

function renderDefault(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  drawBrushedFace(ctx, x, y, w, h, '#111');
  ctx.fillStyle = '#E8A020';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(node.defId, x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
}

// ─── Hit testing (world coordinates) ───
function hitCircle(
  wx: number,
  wy: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  const dx = wx - cx;
  const dy = wy - cy;
  return dx * dx + dy * dy <= r * r;
}

export function hitTestInteractiveControl(
  wx: number,
  wy: number,
  node: EquipmentNode,
  def: EquipmentDef
): ControlHit | null {
  const { x, y, w, h } = {
    x: node.x,
    y: node.y,
    w: def.width,
    h: def.heightUnits > 0 ? def.heightUnits * 44 : 100,
  };

  switch (def.id) {
    case 'neve-1073': {
      const d = def;
      const tests: Array<{ id: string; cx: number; cy: number; r: number }> = [
        { id: 'gain', cx: x + 52, cy: y + h / 2, r: 18 },
        { id: 'high-shelf', cx: x + 175, cy: y + h / 2, r: 16 },
        { id: 'mid-freq', cx: x + 255, cy: y + h / 2, r: 16 },
        { id: 'low-shelf', cx: x + 335, cy: y + h / 2, r: 16 },
      ];
      for (const t of tests) {
        if (!hitCircle(wx, wy, t.cx, t.cy, t.r)) continue;
        const c = controlDef(d, t.id)!;
        const v = numState(node, t.id, c.default as number);
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: t.id,
          min: c.min ?? 0,
          max: c.max ?? 100,
          value: v,
        };
      }
      if (wx >= x + 420 && wx <= x + 448 && wy >= y + h / 2 - 10 && wy <= y + h / 2 + 10) {
        return {
          kind: 'switch',
          nodeId: node.id,
          controlId: 'phantom',
          value: boolState(node, 'phantom', false),
        };
      }
      break;
    }
    case 'api-512c': {
      const d = def;
      if (hitCircle(wx, wy, x + w - 72, y + 48, 18)) {
        const c = controlDef(d, 'gain')!;
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: 'gain',
          min: c.min ?? 0,
          max: c.max ?? 65,
          value: numState(node, 'gain', c.default as number),
        };
      }
      if (
        wx >= x + w - 86 &&
        wx <= x + w - 58 &&
        wy >= y + 86 &&
        wy <= y + 106
      ) {
        return {
          kind: 'switch',
          nodeId: node.id,
          controlId: 'pad',
          value: boolState(node, 'pad', false),
        };
      }
      if (
        wx >= x + w - 86 &&
        wx <= x + w - 58 &&
        wy >= y + 126 &&
        wy <= y + 146
      ) {
        return {
          kind: 'switch',
          nodeId: node.id,
          controlId: 'phantom',
          value: boolState(node, 'phantom', false),
        };
      }
      break;
    }
    case 'urei-1176': {
      const d = def;
      if (hitCircle(wx, wy, x + 70, y + 36, 26)) {
        const c = controlDef(d, 'input')!;
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: 'input',
          min: c.min ?? 0,
          max: c.max ?? 100,
          value: numState(node, 'input', 30),
        };
      }
      if (hitCircle(wx, wy, x + 70, y + 100, 26)) {
        const c = controlDef(d, 'output')!;
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: 'output',
          min: c.min ?? 0,
          max: c.max ?? 100,
          value: numState(node, 'output', 24),
        };
      }
      if (hitCircle(wx, wy, x + w - 160, y + 36, 16)) {
        const c = controlDef(d, 'attack')!;
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: 'attack',
          min: c.min ?? 1,
          max: c.max ?? 7,
          value: numState(node, 'attack', 3),
        };
      }
      if (hitCircle(wx, wy, x + w - 160, y + 76, 16)) {
        const c = controlDef(d, 'release')!;
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: 'release',
          min: c.min ?? 1,
          max: c.max ?? 7,
          value: numState(node, 'release', 4),
        };
      }
      const ratios = [4, 8, 12, 20];
      let by = y + 28;
      for (let i = 0; i < 4; i++) {
        if (
          wx >= x + w - 56 &&
          wx <= x + w - 16 &&
          wy >= by &&
          wy <= by + 14
        ) {
          return { kind: 'ratio', nodeId: node.id, value: ratios[i] };
        }
        by += 18;
      }
      break;
    }
    case 'pultec-eqp1a': {
      const d = def;
      const hh = def.heightUnits > 0 ? def.heightUnits * 44 : 88;
      const knobs: Array<{ id: string; cx: number; cy: number; r: number }> = [
        { id: 'boost-low', cx: x + 62, cy: y + hh * 0.48, r: 36 },
        { id: 'atten-low', cx: x + 178, cy: y + hh * 0.48, r: 36 },
        { id: 'low-freq', cx: x + 120, cy: y + hh * 0.82, r: 22 },
        { id: 'boost-high', cx: x + 320, cy: y + 36, r: 16 },
        { id: 'atten-high', cx: x + 400, cy: y + 36, r: 16 },
        { id: 'high-freq', cx: x + 360, cy: y + 92, r: 14 },
        { id: 'bandwidth', cx: x + 440, cy: y + 92, r: 14 },
      ];
      for (const k of knobs) {
        if (!hitCircle(wx, wy, k.cx, k.cy, k.r)) continue;
        const c = controlDef(d, k.id)!;
        const mn = c.min ?? 0;
        const mx = c.max ?? 10;
        return {
          kind: 'knob',
          nodeId: node.id,
          controlId: k.id,
          min: mn,
          max: mx,
          value: numState(node, k.id, c.default as number),
        };
      }
      break;
    }
    default:
      break;
  }
  return null;
}

export interface PortPick {
  nodeId: string;
  portId: string;
  side: 'input' | 'output';
  type: SignalLevel;
}

const PORT_ROW_H = 14;
const PORT_HIT_X = 16;

/** Hit-test I/O jacks: inputs along top edge, outputs along bottom (world px). */
export function hitTestAnyPort(
  wx: number,
  wy: number,
  node: EquipmentNode,
  def: EquipmentDef,
  deskNode?: { x: number; y: number; width: number; height: number }
): PortPick | null {
  const hh = deskNode?.height ?? (def.heightUnits > 0 ? def.heightUnits * 44 : 100);
  const nx = deskNode?.x ?? node.x;
  const ny = deskNode?.y ?? node.y;

  if (
    def.inputs.length > 0 &&
    wy >= ny &&
    wy <= ny + PORT_ROW_H
  ) {
    for (const p of def.inputs) {
      const px = nx + def.width * p.position;
      if (Math.abs(wx - px) <= PORT_HIT_X) {
        return {
          nodeId: node.id,
          portId: p.id,
          side: 'input',
          type: p.type,
        };
      }
    }
  }

  if (
    def.outputs.length > 0 &&
    wy >= ny + hh - PORT_ROW_H &&
    wy <= ny + hh
  ) {
    for (const p of def.outputs) {
      const px = nx + def.width * p.position;
      if (Math.abs(wx - px) <= PORT_HIT_X) {
        return {
          nodeId: node.id,
          portId: p.id,
          side: 'output',
          type: p.type,
        };
      }
    }
  }

  return null;
}

/** Center of a jack in world coordinates (matches cable rendering). */
export function getPortAnchor(
  node: EquipmentNode,
  def: EquipmentDef,
  portId: string,
  side: 'input' | 'output'
): { x: number; y: number } | null {
  const hh = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
  if (side === 'input') {
    const p = def.inputs.find((i) => i.id === portId);
    if (!p) return null;
    return { x: node.x + def.width * p.position, y: node.y + 5 };
  }
  const p = def.outputs.find((o) => o.id === portId);
  if (!p) return null;
  return { x: node.x + def.width * p.position, y: node.y + hh - 5 };
}

export function renderEquipmentGraphics(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node, isSelected, zoom } = gc;
  ctx.save();

  switch (node.defId) {
    case 'neve-1073':
      renderNeve1073(gc);
      break;
    case 'api-512c':
      renderApi512c(gc);
      break;
    case 'urei-1176':
      renderUrei1176(gc);
      break;
    case 'pultec-eqp1a':
      renderPultec(gc);
      break;
    case 'u87':
      renderU87(gc);
      break;
    case 'shure-sm57':
    case 'shure-sm58':
    case 'akg-c414':
    case 'royer-r121':
      renderSM57(gc);
      break;
    case 'ssl-4000g':
      renderSsl4000gConsole(gc);
      break;
    case 'pearl-asp':
      renderConsoleStrip(gc, '#3d4449', '#c9a227', 'Audient ASP', 24);
      break;
    case 'vortex-1604':
      renderConsoleStrip(gc, '#222', '#E8A020', 'Vortex VX-1604', 16);
      break;
    default:
      renderDefault(gc);
  }

  if (isSelected) {
    ctx.strokeStyle = '#E8A020';
    ctx.lineWidth = 4 / zoom;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore();
}
