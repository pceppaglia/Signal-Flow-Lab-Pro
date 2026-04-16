/**
 * Empty Studio v3.0 — Stage (sides) + centered vertical rack bay (~552px).
 */

import type { EquipmentNode } from '../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';

/** Fixed-width vertical rack column (world px), centered on the canvas. */
export const RACK_WIDTH_PX = 552;

/** Breathing room between stage content and the rack (world px). */
export const STAGE_RACK_GAP_PX = 28;

export const RACK_GRID_TOP_PX = 44;
export const RACK_U_PX = 44;
export const RACK_TOTAL_U = 12;
export const RACK_HEIGHT_PX = RACK_TOTAL_U * RACK_U_PX;
export const RACK_GRID_BOTTOM_PX = RACK_GRID_TOP_PX + RACK_HEIGHT_PX;

/** Fixed world size for canvas layout (rack centered in this space; main view uses pan/zoom). */
export const WORKSPACE_WORLD_W = 2800;
export const WORKSPACE_WORLD_H = 1400;

export function getWorkspaceZones(): StudioZones {
  return getStudioZones(WORKSPACE_WORLD_W, WORKSPACE_WORLD_H);
}

export interface StudioZones {
  vw: number;
  vh: number;
  /** Left edge of the rack column (aligns with full-width rack gear). */
  rackLeft: number;
  rackRight: number;
  rackWidth: number;
  /** Stage / floor usable area is primarily [0, splitX). */
  splitX: number;
  rackZoneLeft: number;
  rackInnerLeft: number;
  rackInnerRight: number;
  /** World X at center of left / right rack rail strips (outer bay edges). */
  rackLeftRail: number;
  rackRightRail: number;
}

export function getStudioZones(vw: number, vh: number): StudioZones {
  const safeVw = Number.isFinite(vw) && vw > 8 ? vw : 1280;
  const safeVh = Number.isFinite(vh) && vh > 8 ? vh : 800;
  const rackW = RACK_WIDTH_PX;
  const rackLeft = Math.max(0, (safeVw - rackW) / 2);
  const rackRight = rackLeft + rackW;
  const railStripW = 14;
  const rackLeftRail = rackLeft + railStripW / 2;
  const rackRightRail = rackRight - railStripW / 2;
  const innerPad = railStripW + 10;
  return {
    vw: safeVw,
    vh: safeVh,
    rackLeft,
    rackRight,
    rackWidth: rackW,
    splitX: rackLeft,
    rackZoneLeft: rackLeft,
    rackInnerLeft: rackLeft + innerPad,
    rackInnerRight: rackRight - innerPad,
    rackLeftRail,
    rackRightRail,
  };
}

/** Rack-mount gear whose center lies inside the vertical rack column. */
export function isRackGearInVerticalBay(
  nodeX: number,
  nodeW: number,
  zones: StudioZones
): boolean {
  const cx = nodeX + nodeW * 0.5;
  return cx >= zones.rackLeft - 2 && cx <= zones.rackRight + 2;
}

/** Snap rack-mount gear to 1U vertical grid and the left edge of the rack bay. */
export function snapRackNodePosition(
  x: number,
  y: number,
  _width: number,
  heightUnits: number,
  vw: number,
  vh?: number
): { x: number; y: number } {
  if (heightUnits <= 0) return { x, y };
  const zones = getStudioZones(vw, vh ?? 800);
  const fy =
    Math.round(Math.max(0, y - RACK_GRID_TOP_PX) / RACK_U_PX) * RACK_U_PX +
    RACK_GRID_TOP_PX;
  const rackH = Math.max(RACK_U_PX, heightUnits * RACK_U_PX);
  const maxY = Math.max(RACK_GRID_TOP_PX, RACK_GRID_BOTTOM_PX - rackH);
  return {
    x: Math.round(zones.rackLeft),
    y: Math.min(Math.max(RACK_GRID_TOP_PX, fy), maxY),
  };
}

export function defaultRackColumnX(zones: StudioZones, _width: number): number {
  return Math.round(zones.rackLeft);
}

/** True if [a0,a1) overlaps [b0,b1) in Y. */
function yRangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/**
 * Next free rack position on the 1U vertical grid (44px), scanning from the top.
 */
export function nextRackSlot(
  nodes: EquipmentNode[],
  newDef: EquipmentDef,
  zones: StudioZones,
  defs: EquipmentDef[]
): { x: number; y: number } {
  const colX = defaultRackColumnX(zones, newDef.width);
  const needH = newDef.heightUnits * RACK_U_PX;
  const maxY = Math.max(RACK_GRID_TOP_PX, RACK_GRID_BOTTOM_PX - needH);

  const occupied: { top: number; bottom: number }[] = [];
  for (const n of nodes) {
    const d = defs.find((e) => e.id === n.defId);
    if (!d || d.heightUnits <= 0) continue;
    const cx = n.x + d.width * 0.5;
    if (cx < zones.rackLeft + 4) continue;
    const top = n.y;
    const bottom = n.y + d.heightUnits * RACK_U_PX;
    occupied.push({ top, bottom });
  }

  for (let y = RACK_GRID_TOP_PX; y <= maxY; y += RACK_U_PX) {
    const y1 = y + needH;
    const hit = occupied.some((o) => yRangesOverlap(y, y1, o.top, o.bottom));
    if (!hit) return { x: colX, y };
  }

  let lowest = RACK_GRID_TOP_PX;
  for (const o of occupied) lowest = Math.max(lowest, o.bottom);
  return { x: colX, y: Math.min(lowest, maxY) };
}

function nodeBounds(
  n: EquipmentNode,
  defs: EquipmentDef[]
): { x: number; y: number; w: number; h: number } | null {
  const d = defs.find((e) => e.id === n.defId);
  if (!d) return null;
  const h = d.heightUnits > 0 ? d.heightUnits * 44 : 100;
  return { x: n.x, y: n.y, w: d.width, h };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

/** Next free slot on the Stage for floor / source gear (outside the rack column). */
export function nextStageSlot(
  nodes: EquipmentNode[],
  def: EquipmentDef,
  zones: StudioZones,
  defs: EquipmentDef[]
): { x: number; y: number } {
  const pad = 28;
  const cellW = Math.max(200, def.width + 32);
  const cellH = 130;
  const stageRight = zones.rackLeft - STAGE_RACK_GAP_PX - pad;
  const aw = def.width;
  const ah = def.heightUnits > 0 ? def.heightUnits * 44 : 100;

  const candidateBoxes = nodes
    .map((n) => nodeBounds(n, defs))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .filter((b) => b.x + b.w * 0.5 < zones.rackLeft - STAGE_RACK_GAP_PX);

  for (let row = 0; row < 14; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = pad + col * cellW;
      const y = 52 + row * cellH;
      if (x + aw > stageRight || stageRight < pad + 40) continue;
      const box = { x, y, w: aw, h: ah };
      const hit = candidateBoxes.some((b) => rectsOverlap(box, b));
      if (!hit) return { x, y };
    }
  }
  return { x: pad, y: 52 };
}
