/**
 * Photorealistic rack & floor equipment rendering + rack snapping + control hit-testing.
 */

import type { EquipmentNode } from '../../../shared/equipment-types';
import type { EquipmentDef, SignalLevel } from '@/lib/equipment-library';
import { equipmentLibrary } from '@/lib/equipment-library';
import type { StudioZones } from '@/lib/studio-layout';
import {
  RACK_WIDTH_PX,
  RACK_GRID_TOP_PX,
  RACK_GRID_BOTTOM_PX,
  RACK_WOOD_PANEL_W,
  RACK_RAIL_W,
  RACK_U_PX,
  RACK_TOTAL_U,
  snapRackNodePosition as snapRackNodePositionFromLayout,
} from '@/lib/studio-layout';

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

/** Rack-mount gear snaps to 1U grid inside the centered vertical rack (viewport width + height). */
export function snapRackNodePosition(
  x: number,
  y: number,
  width: number,
  heightUnits: number,
  worldWidth: number,
  worldHeight?: number,
  rackTopY?: number
): { x: number; y: number } {
  return snapRackNodePositionFromLayout(
    x,
    y,
    width,
    heightUnits,
    worldWidth,
    worldHeight,
    rackTopY
  );
}

/** Rack ear width (px); aligns with metal rails at bay outer edges. */
const RACK_EAR_W_PX = 18;

function fillDarkWalnutPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w * 1.15, y + h * 0.85);
  g.addColorStop(0, '#1a0f0a');
  g.addColorStop(0.2, '#2a1810');
  g.addColorStop(0.45, '#3d2418');
  g.addColorStop(0.72, '#26160f');
  g.addColorStop(1, '#140a08');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < w; i += 3) {
    ctx.strokeStyle = i % 9 === 0 ? '#5c3d2e' : '#352018';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + 0.8, y + h);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.07;
  for (let j = 0; j < h; j += 14) {
    ctx.fillStyle = j % 28 < 14 ? 'rgba(0,0,0,0.5)' : 'rgba(90,55,40,0.35)';
    ctx.fillRect(x, y + j, w, 1);
  }
  ctx.restore();
}

/**
 * Photoreal-ish top-down wood frame + integrated rails for a rack instance.
 *
 * Coordinate system: (x,y) is the top-left of the outer wood frame in world px.
 */
export function drawHardwareRackFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  zoom: number
): void {
  if (
    !Number.isFinite(zoom) ||
    zoom <= 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    width <= 0 ||
    height <= 0
  )
    return;

  const woodW = RACK_WOOD_PANEL_W;
  const railW = RACK_RAIL_W;

  const leftWoodX = x;
  const rightWoodX = x + width - woodW;
  const leftRailX = leftWoodX + woodW;
  const rightRailX = rightWoodX - railW;
  const innerLeftX = leftWoodX + woodW;
  const innerRightX = rightWoodX;

  ctx.save();

  // --- Wood veneer back (visible in empty rack slots; drawn before rails & gear) ---
  const innerBayW = Math.max(0, innerRightX - innerLeftX);
  if (innerBayW > 0) {
    fillDarkWalnutPanel(ctx, innerLeftX, y, innerBayW, height);
  }

  // --- Wood side panels (top-down lighting) ---
  const woodTop = '#3d2b1f';
  const woodBottom = '#1a0f0a';
  const woodGrad = ctx.createLinearGradient(x, y, x, y + height);
  woodGrad.addColorStop(0, woodTop);
  woodGrad.addColorStop(0.35, '#2a1a12');
  woodGrad.addColorStop(1, woodBottom);

  const drawWoodPanel = (px: number, isRight: boolean) => {
    // Base fill.
    ctx.fillStyle = woodGrad;
    ctx.fillRect(px, y, woodW, height);

    // Grain: thin vertical strokes at low alpha.
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < woodW; i += 3) {
      const gx = px + i + (i % 2 === 0 ? 0.2 : -0.2);
      ctx.strokeStyle = i % 9 === 0 ? '#5b3a2a' : '#2b1a12';
      ctx.lineWidth = 0.7 / zoom;
      ctx.beginPath();
      ctx.moveTo(gx, y + 2);
      ctx.lineTo(gx + 0.6, y + height - 2);
      ctx.stroke();
    }
    ctx.restore();

    // Inner bevel highlight (simulate a thin 1px chamfer).
    ctx.fillStyle = 'rgba(255,215,160,0.22)';
    const innerEdgeX = isRight ? px + 0 : px + woodW - 1;
    ctx.fillRect(innerEdgeX, y, 1 / zoom, height);

    // Outer edge shadow for depth.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    const outerEdgeX = isRight ? px + woodW - 1 : px;
    ctx.fillRect(outerEdgeX, y, 1 / zoom, height);

    // Subtle top specular sheen.
    ctx.fillStyle = 'rgba(255,240,210,0.08)';
    ctx.fillRect(px, y, woodW, Math.max(10, 26 / zoom));
  };

  drawWoodPanel(leftWoodX, false);
  drawWoodPanel(rightWoodX, true);

  // --- Brushed steel rails inside the wood panels ---
  const railGrad = ctx.createLinearGradient(leftRailX, y, leftRailX + railW, y);
  railGrad.addColorStop(0, '#2d2d2d');
  railGrad.addColorStop(0.35, '#3a3a3a');
  railGrad.addColorStop(0.7, '#232323');
  railGrad.addColorStop(1, '#2d2d2d');

  const drawRail = (rx: number) => {
    ctx.fillStyle = railGrad;
    ctx.fillRect(rx, y, railW, height);

    // Brushed lines: lots of faint vertical strokes.
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#6d6d6d';
    ctx.lineWidth = 0.6 / zoom;
    for (let i = 0; i < railW; i += 2) {
      ctx.beginPath();
      ctx.moveTo(rx + i + 0.3, y + 2);
      ctx.lineTo(rx + i - 0.2, y + height - 2);
      ctx.stroke();
    }
    ctx.restore();

    // Thin edge highlight.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(rx + 0.5 / zoom, y + 0.5 / zoom, railW - 1 / zoom, height - 1 / zoom);
  };

  drawRail(leftRailX);
  drawRail(rightRailX);

  // --- Screw holes: every 14.6px along the rails center ---
  const holeR = 2.2 / zoom;
  const holeColor = '#1a1a1a';
  const holeStep = 14.6;
  const leftCx = leftRailX + railW * 0.5;
  const rightCx = rightRailX + railW * 0.5;
  const holeStartY = y + 14.6;
  const holeEndY = y + height - 0.1;
  for (let hy = holeStartY; hy <= holeEndY; hy += holeStep) {
    for (const cx of [leftCx, rightCx]) {
      ctx.beginPath();
      ctx.fillStyle = holeColor;
      ctx.arc(cx, hy, holeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.8 / zoom;
      ctx.stroke();
    }
  }

  // --- Inner depth / recess shadow inside the wood opening ---
  const innerW = innerRightX - innerLeftX;
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerLeftX, y, innerW, height);
  ctx.clip();

  // Top-down darkening (lighter at top, darker at bottom).
  const innerGrad = ctx.createLinearGradient(0, y, 0, y + height);
  innerGrad.addColorStop(0, 'rgba(0,0,0,0.06)');
  innerGrad.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  innerGrad.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = innerGrad;
  ctx.fillRect(innerLeftX, y, innerW, height);

  // Inset side shadows near the rail/wood edges.
  const sideFade = 26 / zoom;
  const leftSide = ctx.createLinearGradient(innerLeftX, 0, innerLeftX + sideFade, 0);
  leftSide.addColorStop(0, 'rgba(0,0,0,0.42)');
  leftSide.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftSide;
  ctx.fillRect(innerLeftX, y, sideFade, height);

  const rightSide = ctx.createLinearGradient(innerRightX - sideFade, 0, innerRightX, 0);
  rightSide.addColorStop(0, 'rgba(0,0,0,0)');
  rightSide.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = rightSide;
  ctx.fillRect(innerRightX - sideFade, y, sideFade, height);

  // Soft top highlight for depth.
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(innerLeftX, y, innerW, Math.max(8, 22 / zoom));
  ctx.restore();

  ctx.restore();
}

/**
 * Vertical rack: wood bay, metal rails at outer edges, stage wings.
 */
export function drawRackRails(
  ctx: CanvasRenderingContext2D,
  zones: StudioZones,
  vh: number,
  z: number
): void {
  if (
    !Number.isFinite(vh) ||
    vh <= 0 ||
    !Number.isFinite(z) ||
    z <= 0
  ) {
    return;
  }
  const { rackLeft, rackRight, rackLeftRail: L, rackRightRail: R, vw } = zones;
  if (![L, R, rackLeft, rackRight, vw].every((n) => Number.isFinite(n))) {
    return;
  }
  ctx.save();

  const stageGradL = ctx.createLinearGradient(0, 0, rackLeft, 0);
  stageGradL.addColorStop(0, '#08090c');
  stageGradL.addColorStop(1, '#101218');
  ctx.fillStyle = stageGradL;
  ctx.fillRect(0, 0, rackLeft, vh);

  const stageGradR = ctx.createLinearGradient(rackRight, 0, vw, 0);
  stageGradR.addColorStop(0, '#101218');
  stageGradR.addColorStop(1, '#08090c');
  ctx.fillStyle = stageGradR;
  ctx.fillRect(rackRight, 0, vw - rackRight, vh);

  const bayW = rackRight - rackLeft;
  const rackTop = RACK_GRID_TOP_PX;
  const rackBottom = Math.min(vh - 1, RACK_GRID_BOTTOM_PX);
  const rackH = Math.max(0, rackBottom - rackTop);
  fillDarkWalnutPanel(ctx, rackLeft, rackTop, bayW, rackH);
  const capH = 16;
  const capG = ctx.createLinearGradient(rackLeft, rackTop - capH, rackLeft, rackTop);
  capG.addColorStop(0, '#2b1a13');
  capG.addColorStop(1, '#1a0f0a');
  ctx.fillStyle = capG;
  ctx.fillRect(rackLeft, rackTop - capH, bayW, capH);
  const botG = ctx.createLinearGradient(rackLeft, rackBottom, rackLeft, rackBottom + capH);
  botG.addColorStop(0, '#1a0f0a');
  botG.addColorStop(1, '#2b1a13');
  ctx.fillStyle = botG;
  ctx.fillRect(rackLeft, rackBottom, bayW, capH);
  const earW = RACK_EAR_W_PX;
  ctx.fillStyle = 'rgba(8,4,2,0.38)';
  ctx.fillRect(rackLeft + earW, rackTop, bayW - 2 * earW, rackH);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1 / z;
  ctx.strokeRect(rackLeft + earW + 0.5, rackTop + 0.5, bayW - 2 * earW - 1, rackH - 1);
  ctx.strokeStyle = 'rgba(232,160,32,0.18)';
  ctx.lineWidth = 1.2 / z;
  ctx.strokeRect(rackLeft + 0.5 / z, rackTop + 0.5 / z, bayW - 1 / z, rackH - 1 / z);

  const drawPost = (cx: number) => {
    const stripW = 14 / z;
    const x0 = cx - stripW / 2;
    const g = ctx.createLinearGradient(x0, 0, x0 + stripW, 0);
    g.addColorStop(0, '#1c1c20');
    g.addColorStop(0.15, '#4a4d56');
    g.addColorStop(0.35, '#8f939c');
    g.addColorStop(0.5, '#3d4047');
    g.addColorStop(0.65, '#6d717a');
    g.addColorStop(0.82, '#2e3036');
    g.addColorStop(1, '#141418');
    ctx.fillStyle = g;
    ctx.fillRect(x0, rackTop, stripW, rackH);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.6 / z;
    ctx.beginPath();
    ctx.moveTo(x0, rackTop);
    ctx.lineTo(x0, rackBottom);
    ctx.moveTo(x0 + stripW, rackTop);
    ctx.lineTo(x0 + stripW, rackBottom);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(x0 + stripW * 0.35, rackTop);
    ctx.lineTo(x0 + stripW * 0.35, rackBottom);
    ctx.stroke();

    const holeSpacing = 44;
    for (let hy = rackTop + 22; hy < rackBottom - 12; hy += holeSpacing) {
      ctx.beginPath();
      ctx.fillStyle = '#0a0a0c';
      ctx.arc(cx, hy, 3.2 / z, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5 / z;
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.arc(cx, hy, 2.2 / z, 0.3, Math.PI * 1.2);
      ctx.stroke();
    }

    for (let sy = rackTop + 18; sy < rackBottom - 8; sy += 52) {
      const sr = 2.4 / z;
      for (const sign of [-1, 1] as const) {
        const scx = cx + sign * stripW * 0.55;
        ctx.beginPath();
        const sg = ctx.createRadialGradient(
          scx - sr * 0.3,
          sy - sr * 0.3,
          0,
          scx,
          sy,
          sr * 1.4
        );
        sg.addColorStop(0, '#e8eaef');
        sg.addColorStop(0.55, '#9a9ea6');
        sg.addColorStop(1, '#4a4d52');
        ctx.fillStyle = sg;
        ctx.arc(scx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.45 / z;
        ctx.stroke();
      }
    }
  };

  drawPost(L);
  drawPost(R);
  ctx.restore();
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

function rackInnerMetrics(
  x: number,
  w: number
): { ix: number; iw: number; ears: boolean } {
  const ears = w >= RACK_WIDTH_PX - 8;
  if (!ears) return { ix: x, iw: w, ears: false };
  return { ix: x + RACK_EAR_W_PX, iw: w - 2 * RACK_EAR_W_PX, ears: true };
}

function drawRackEarScrew(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const r = 2.1;
  const wg = ctx.createRadialGradient(cx - 0.35, cy - 0.35, 0, cx, cy, r * 1.5);
  wg.addColorStop(0, '#eceff4');
  wg.addColorStop(0.65, '#8a8f98');
  wg.addColorStop(1, '#3e4248');
  ctx.beginPath();
  ctx.fillStyle = wg;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.45;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(25,25,30,0.9)';
  ctx.lineWidth = 0.55;
  const s = 0.9;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx, cy + s);
  ctx.stroke();
}

function drawRackEars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const ear = RACK_EAR_W_PX;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x + 2, y + h - 2, ear - 2, 4);
  ctx.fillRect(x + w - ear, y + h - 2, ear - 2, 4);
  ctx.restore();
  const drawStrip = (sx: number, flip: boolean) => {
    const g = ctx.createLinearGradient(
      flip ? sx + ear : sx,
      y,
      flip ? sx : sx + ear,
      y
    );
    if (flip) {
      g.addColorStop(0, '#14161c');
      g.addColorStop(0.28, '#2f333a');
      g.addColorStop(0.45, '#8e939d');
      g.addColorStop(0.65, '#3d424b');
      g.addColorStop(1, '#0c0e12');
    } else {
      g.addColorStop(0, '#0c0e12');
      g.addColorStop(0.35, '#3d424b');
      g.addColorStop(0.55, '#8e939d');
      g.addColorStop(0.72, '#2f333a');
      g.addColorStop(1, '#14161c');
    }
    ctx.fillStyle = g;
    ctx.fillRect(sx, y, ear, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, y + 0.5, ear - 1, h - 1);
    const yt = Math.min(y + 6, y + h * 0.22);
    const yb = Math.max(y + h - 6, y + h * 0.78);
    const xl = sx + ear * 0.28;
    const xr = sx + ear * 0.72;
    drawRackEarScrew(ctx, xl, yt);
    drawRackEarScrew(ctx, xr, yt);
    drawRackEarScrew(ctx, xl, yb);
    drawRackEarScrew(ctx, xr, yb);
  };
  drawStrip(x, false);
  drawStrip(x + w - ear, true);
}

function rackPowerWidgetBounds(
  node: EquipmentNode,
  def: EquipmentDef
): { x: number; y: number; w: number; h: number; ledX: number; ledY: number; ledR: number } | null {
  if (def.heightUnits <= 0) return null;
  const h = def.heightUnits * 44;
  const bw = 26;
  const bh = 12;
  const bx = node.x + def.width - RACK_EAR_W_PX - bw - 7;
  const by = node.y + 6;
  return {
    x: bx,
    y: by,
    w: bw,
    h: bh,
    ledX: bx - 8,
    ledY: by + bh * 0.5,
    ledR: 2.7,
  };
}

function drawRackPowerWidget(
  ctx: CanvasRenderingContext2D,
  node: EquipmentNode,
  def: EquipmentDef
): void {
  const b = rackPowerWidgetBounds(node, def);
  if (!b) return;
  const on = node.state?.power !== false;
  ctx.save();
  ctx.fillStyle = on ? '#8d2218' : '#2a1715';
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  if (on) {
    ctx.fillRect(b.x + 3, b.y + 2, b.w - 7, 3);
  } else {
    ctx.fillRect(b.x + 4, b.y + b.h - 5, b.w - 8, 3);
  }
  ctx.beginPath();
  ctx.arc(b.ledX, b.ledY, b.ledR, 0, Math.PI * 2);
  ctx.fillStyle = on ? '#64ff9a' : '#3d4b42';
  ctx.shadowColor = on ? 'rgba(100,255,154,0.9)' : 'transparent';
  ctx.shadowBlur = on ? 10 : 0;
  ctx.fill();
  ctx.restore();
}

/** Outer grey skirt + inner colored cap (classic concentric EQ stack). */
function drawConcentricEqKnob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  innerBlue: boolean,
  compact?: boolean
): void {
  const outerR = compact ? 9 : 14;
  const innerR = compact ? 6 : 9;
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

interface DrawBrushedFaceOpts {
  rackEars?: boolean;
}

function drawBrushedFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  opts?: DrawBrushedFaceOpts
): void {
  const useEars = Boolean(opts?.rackEars && w >= RACK_WIDTH_PX - 8);
  if (useEars) {
    drawRackEars(ctx, x, y, w, h);
  }
  const ix = useEars ? x + RACK_EAR_W_PX : x;
  const iw = useEars ? w - 2 * RACK_EAR_W_PX : w;

  ctx.fillStyle = base;
  ctx.fillRect(ix, y, iw, h);
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < iw; i += 2) {
    ctx.fillStyle = i % 4 === 0 ? '#fff' : '#000';
    ctx.fillRect(ix + i, y, 1, h);
  }
  ctx.restore();

  const u = 44;
  for (let y0 = y; y0 < y + h; y0 += u) {
    const segBottom = Math.min(y0 + u, y + h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(ix, y0, iw, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(ix, segBottom - 1, iw, 1);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ix + 0.5, y + 0.5, iw - 1, h - 1);
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
  drawBrushedFace(ctx, x, y, w, h, raf, { rackEars: true });
  const { ix, iw } = rackInnerMetrics(x, w);
  const compact = h <= 44.5;
  const kr = compact ? 10 : 16;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, y, iw, h);
  ctx.clip();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = compact ? 'bold 9px "Helvetica Neue", sans-serif' : 'bold 11px "Helvetica Neue", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('1073', ix + iw - 44, y + (compact ? 12 : 16));

  const lib = equipmentLibrary.find((e) => e.id === 'neve-1073')!;
  const g = controlDef(lib, 'gain')!;
  const gainV = numState(node, 'gain', g.default as number);
  const gcx = ix + iw * (g.relX ?? 0.09);
  const gcy = y + h * (g.relY ?? 0.5);
  if (gcy <= y + h - 5 && gcy >= y + 5) {
    drawMarconiGainTicks(ctx, gcx, gcy, kr);
    drawKnobAt(
      ctx,
      gcx,
      gcy,
      kr,
      marconiGainAngle(g.min ?? 20, g.max ?? 80, gainV),
      'marconi'
    );
  }

  const hi = controlDef(lib, 'high-shelf')!;
  const mid = controlDef(lib, 'mid-freq')!;
  const lo = controlDef(lib, 'low-shelf')!;
  const yEq = y + h * (hi.relY ?? 0.5);
  drawConcentricEqKnob(
    ctx,
    ix + iw * (hi.relX ?? 0.28),
    yEq,
    knobAngle(hi.min ?? -15, hi.max ?? 15, numState(node, 'high-shelf', 0)),
    true,
    compact
  );
  drawConcentricEqKnob(
    ctx,
    ix + iw * (mid.relX ?? 0.44),
    yEq,
    knobAngle(mid.min ?? 0.36, mid.max ?? 7.2, numState(node, 'mid-freq', 1.6)),
    true,
    compact
  );
  drawConcentricEqKnob(
    ctx,
    ix + iw * (lo.relX ?? 0.6),
    yEq,
    knobAngle(lo.min ?? -15, lo.max ?? 15, numState(node, 'low-shelf', 0)),
    false,
    compact
  );

  ctx.fillStyle = '#8899aa';
  ctx.font = compact ? '6px sans-serif' : '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAIN', gcx, y + h - 4);
  ctx.fillText('HI', ix + iw * (hi.relX ?? 0.28), y + h - 4);
  ctx.fillText('MID', ix + iw * (mid.relX ?? 0.44), y + h - 4);
  ctx.fillText('LO', ix + iw * (lo.relX ?? 0.6), y + h - 4);

  const ph = boolState(node, 'phantom', false);
  const phx = ix + iw * (controlDef(lib, 'phantom')!.relX ?? 0.78);
  const phy = y + h * (controlDef(lib, 'phantom')!.relY ?? 0.5);
  const pw = compact ? 22 : 28;
  const phh = compact ? 10 : 16;
  ctx.fillStyle = ph ? '#E8A020' : '#333';
  ctx.fillRect(phx - pw / 2, phy - phh / 2, pw, phh);
  ctx.fillStyle = '#ccc';
  ctx.font = compact ? '6px sans-serif' : '7px sans-serif';
  ctx.fillText('48V', phx, phy + 3);
  ctx.textAlign = 'left';
  ctx.restore();
}

// ─── API 512c ───
function renderApi512c(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  drawBrushedFace(ctx, x, y, w, h, '#1c1c1c', { rackEars: true });
  const { ix, iw } = rackInnerMetrics(x, w);
  const lib = equipmentLibrary.find((e) => e.id === 'api-512c')!;
  const g = controlDef(lib, 'gain')!;
  const padC = controlDef(lib, 'pad')!;
  const p48 = controlDef(lib, 'phantom')!;
  const gv = numState(node, 'gain', g.default as number);
  const gcx = ix + iw * (g.relX ?? 0.38);
  const gcy = y + h * (g.relY ?? 0.64);
  const rowY = y + h * (padC.relY ?? 0.64);
  const pcx = ix + iw * (padC.relX ?? 0.5);
  const phx = ix + iw * (p48.relX ?? 0.62);
  const btn = 8;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = '#0054a6';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('API', ix + iw / 2, y + 10);
  ctx.fillStyle = '#888';
  ctx.font = '7px sans-serif';
  ctx.fillText('512c', ix + iw / 2, y + 18);

  if (gcy <= y + h - 5 && gcy >= y + 5) {
    drawKnobAt(
      ctx,
      gcx,
      gcy,
      10,
      knobAngle(g.min ?? 0, g.max ?? 65, gv),
      'silver'
    );
    ctx.fillStyle = '#aaa';
    ctx.font = '6px sans-serif';
    ctx.fillText('GAIN', gcx, gcy + 14);
  }

  if (rowY <= y + h - 5 && rowY >= y + 5) {
    ctx.fillStyle = boolState(node, 'pad', false) ? '#0054a6' : '#444';
    ctx.fillRect(pcx - btn / 2, rowY - btn / 2, btn, btn);
    ctx.fillStyle = boolState(node, 'phantom', false) ? '#0054a6' : '#444';
    ctx.fillRect(phx - btn / 2, rowY - btn / 2, btn, btn);
    ctx.fillStyle = '#ccc';
    ctx.font = '6px sans-serif';
    ctx.fillText('PAD', pcx, rowY + 14);
    ctx.fillText('48V', phx, rowY + 14);
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

// ─── UREI 1176 ───
function renderUrei1176(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  drawBrushedFace(ctx, x, y, w, h, '#151515', { rackEars: true });

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
  drawBrushedFace(ctx, x, y, w, h, navy, { rackEars: true });

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
  drawBrushedFace(ctx, x, y, w, h, '#2d2d2d', { rackEars: true });

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
  drawBrushedFace(ctx, x, y, w, h, face, { rackEars: true });
  const { ix, iw } = rackInnerMetrics(x, w);
  if (label) {
    ctx.fillStyle = accent;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(label, ix + 8, y + 18);
  }
  const chW = Math.min(48, (iw - 16) / Math.min(channels, 16));
  for (let i = 0; i < Math.min(channels, 16); i++) {
    const cx = ix + 8 + i * chW;
    ctx.fillStyle = '#333';
    ctx.fillRect(cx, y + 40, chW - 6, h - 52);
    ctx.fillStyle = accent;
    ctx.fillRect(cx + chW / 2 - 2, y + h - 36, 4, 22);
  }
}

/** Generic clippable control renderer: positions from `relX` / `relY` on the inner rack face. */
function renderControls(
  ctx: CanvasRenderingContext2D,
  gc: GraphicsContext,
  def: EquipmentDef
): void {
  const { x, y, w, h, node } = gc;
  const oneU = h <= 44.5;
  const knobR = oneU ? 10 : 14;
  const btnS = oneU ? 8 : 12;
  const useInner = (def.heightUnits ?? 0) > 0 && w >= RACK_WIDTH_PX - 8;
  const { ix, iw } = useInner ? rackInnerMetrics(x, w) : { ix: x, iw: w };

  const drawable = def.controls.filter(
    (c) =>
      c.type === 'knob' ||
      c.type === 'switch' ||
      c.type === 'button' ||
      c.type === 'select'
  );
  const missingRel = drawable.filter((c) => c.relX === undefined);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (const c of def.controls) {
    if (c.type === 'fader') continue;

    let relX = c.relX;
    const defaultY = oneU ? 0.58 : 0.52;
    let relY = c.relY ?? defaultY;

    if (
      (c.type === 'knob' ||
        c.type === 'switch' ||
        c.type === 'button' ||
        c.type === 'select') &&
      relX === undefined
    ) {
      const idx = missingRel.indexOf(c);
      if (idx >= 0) {
        relX =
          missingRel.length <= 1 ? 0.5 : (idx + 1) / (missingRel.length + 1);
      }
    }
    if (relX === undefined) continue;

    const cx = ix + iw * relX;
    const cy = y + h * relY;
    if (cy > y + h - 5 || cy < y + 5) continue;

    switch (c.type) {
      case 'knob': {
        const v = numState(node, c.id, c.default as number);
        const mn = c.min ?? 0;
        const mx = c.max ?? 100;
        drawKnobAt(ctx, cx, cy, knobR, knobAngle(mn, mx, v), 'silver');
        break;
      }
      case 'switch':
      case 'button': {
        const on = boolState(node, c.id, Boolean(c.default));
        ctx.fillStyle = on ? '#E8A020' : '#444';
        ctx.fillRect(cx - btnS / 2, cy - btnS / 2, btnS, btnS);
        break;
      }
      case 'select': {
        const curRaw = node.state?.[c.id];
        const cur =
          typeof curRaw === 'string'
            ? curRaw
            : typeof c.default === 'string'
              ? c.default
              : String(c.options?.[0]?.value ?? '');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(cx - 24, cy - 10, 48, 20);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 24, cy - 10, 48, 20);
        ctx.fillStyle = '#ccc';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        const label =
          c.options?.find((o) => o.value === cur)?.label ?? String(cur);
        ctx.fillText(label.slice(0, 8), cx, cy + 3);
        ctx.textAlign = 'left';
        break;
      }
      default:
        break;
    }
  }

  ctx.restore();
}

function renderDefault(gc: GraphicsContext): void {
  const { ctx, x, y, w, h, node } = gc;
  const def = equipmentLibrary.find((e) => e.id === node.defId);
  const rackEars = Boolean(def && def.heightUnits > 0 && w >= RACK_WIDTH_PX - 8);
  drawBrushedFace(ctx, x, y, w, h, '#111', { rackEars });
  if (
    def &&
    def.controls.some(
      (c) =>
        c.type === 'knob' ||
        c.type === 'switch' ||
        c.type === 'button' ||
        c.type === 'select'
    )
  ) {
    renderControls(ctx, gc, def);
    return;
  }
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
      const { ix, iw } = rackInnerMetrics(x, w);
      const compact = h <= 44.5;
      const kr = compact ? 12 : 18;
      const knobIds = ['gain', 'high-shelf', 'mid-freq', 'low-shelf'] as const;
      const tests: Array<{ id: string; cx: number; cy: number; r: number }> =
        knobIds.map((id) => {
          const c = controlDef(d, id)!;
          return {
            id,
            cx: ix + iw * (c.relX ?? 0.5),
            cy: y + h * (c.relY ?? 0.5),
            r: id === 'gain' ? kr + 2 : kr,
          };
        });
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
      const ph = controlDef(d, 'phantom')!;
      const phx = ix + iw * (ph.relX ?? 0.78);
      const phy = y + h * (ph.relY ?? 0.5);
      const pw = compact ? 22 : 28;
      const phh = compact ? 10 : 16;
      if (
        wx >= phx - pw / 2 &&
        wx <= phx + pw / 2 &&
        wy >= phy - phh / 2 &&
        wy <= phy + phh / 2
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
    case 'api-512c': {
      const d = def;
      const { ix, iw } = rackInnerMetrics(x, w);
      const g = controlDef(d, 'gain')!;
      const padC = controlDef(d, 'pad')!;
      const p48 = controlDef(d, 'phantom')!;
      const gcx = ix + iw * (g.relX ?? 0.38);
      const gcy = y + h * (g.relY ?? 0.64);
      if (hitCircle(wx, wy, gcx, gcy, 14)) {
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
      const rowY = y + h * (padC.relY ?? 0.64);
      const pcx = ix + iw * (padC.relX ?? 0.5);
      const phx = ix + iw * (p48.relX ?? 0.62);
      const btn = 8;
      if (
        wx >= pcx - btn / 2 &&
        wx <= pcx + btn / 2 &&
        wy >= rowY - btn / 2 &&
        wy <= rowY + btn / 2
      ) {
        return {
          kind: 'switch',
          nodeId: node.id,
          controlId: 'pad',
          value: boolState(node, 'pad', false),
        };
      }
      if (
        wx >= phx - btn / 2 &&
        wx <= phx + btn / 2 &&
        wy >= rowY - btn / 2 &&
        wy <= rowY + btn / 2
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
  const power = rackPowerWidgetBounds(node, def);
  if (
    power &&
    wx >= power.x - 4 &&
    wx <= power.x + power.w + 4 &&
    wy >= power.y - 3 &&
    wy <= power.y + power.h + 3
  ) {
    return {
      kind: 'switch',
      nodeId: node.id,
      controlId: 'power',
      value: boolState(node, 'power', true),
    };
  }
  return null;
}

export interface PortPick {
  nodeId: string;
  portId: string;
  side: 'input' | 'output';
  type: SignalLevel;
}

const PORT_ROW_H = 16;
const PORT_HIT_X = 22;

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
    case 'professional-mixer-console':
      renderConsoleStrip(gc, '#1f1f1f', '#9cd3ff', '', 12);
      break;
    default:
      renderDefault(gc);
  }
  const thisDef = equipmentLibrary.find((e) => e.id === node.defId);
  if (thisDef && thisDef.heightUnits > 0) {
    drawRackPowerWidget(ctx, node, thisDef);
  }

  if (isSelected) {
    ctx.strokeStyle = '#E8A020';
    ctx.lineWidth = 4 / zoom;
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore();
}
