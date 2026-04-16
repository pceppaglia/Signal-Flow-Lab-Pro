/**
 * Empty Studio v3.0 — Stage (sides) + draggable vertical rack bay.
 *
 * Rack geometry is expressed in "world px" (canvas CSS pixels / zoom).
 */

import type { EquipmentNode } from '../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';

/** Wood frame width (outer), including both 24px wood side panels. */
export const RACK_OUTER_W = 600;
/** Internal rail width (inner), spanning between the inner faces of the rails. */
export const RACK_INNER_W = 552;
/** Back-compat alias: standard rack-mount faceplate width. */
export const RACK_WIDTH_PX = RACK_INNER_W;

/** Wood side panel width (px). */
export const RACK_WOOD_PANEL_W = 24;
/** Brushed steel rail width (px). */
export const RACK_RAIL_W = 14;

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
  const rackW = RACK_OUTER_W;
  const rackLeft = Math.max(0, (safeVw - rackW) / 2);
  const rackRight = rackLeft + rackW;
  const railStripW = RACK_RAIL_W;
  // Rails sit inside the wood panels.
  const rackLeftRail = rackLeft + RACK_WOOD_PANEL_W + railStripW / 2;
  const rackRightRail = rackRight - RACK_WOOD_PANEL_W - railStripW / 2;
  return {
    vw: safeVw,
    vh: safeVh,
    rackLeft,
    rackRight,
    rackWidth: rackW,
    splitX: rackLeft,
    rackZoneLeft: rackLeft,
    rackInnerLeft: rackLeft + RACK_WOOD_PANEL_W,
    rackInnerRight: rackRight - RACK_WOOD_PANEL_W,
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
  return cx >= zones.rackInnerLeft - 2 && cx <= zones.rackInnerRight + 2;
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
  void vw; // rack snapping no longer depends on fixed centered bay.

  // Requirement: preserve horizontal position, but enforce 1U vertical snapping.
  // Logic requirement: for heightUnits > 0, y must always be a multiple of
  // `44 + RACK_GRID_TOP_PX` (with 44px = RACK_U_PX).
  const fy = Math.round((y - RACK_GRID_TOP_PX) / RACK_U_PX) * RACK_U_PX + RACK_GRID_TOP_PX;
  const worldH = vh ?? 800;
  const rackH = Math.max(RACK_U_PX, heightUnits * RACK_U_PX);
  const maxYBound = Math.max(0, worldH - rackH);

  // Clamp *while staying on-grid* so y remains a multiple of 44px increments.
  const minSlot = Math.ceil((0 - RACK_GRID_TOP_PX) / RACK_U_PX) * RACK_U_PX + RACK_GRID_TOP_PX;
  const maxSlot =
    Math.floor((maxYBound - RACK_GRID_TOP_PX) / RACK_U_PX) * RACK_U_PX + RACK_GRID_TOP_PX;
  const cy = Math.min(Math.max(fy, minSlot), maxSlot);
  return {
    x,
    y: cy,
  };
}

export function defaultRackColumnX(zones: StudioZones, _width: number): number {
  return Math.round(zones.rackInnerLeft);
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
  rackPosition: { x: number; y: number },
  defs: EquipmentDef[]
): { x: number; y: number } | null {
  const colX = Math.round(rackPosition.x + RACK_WOOD_PANEL_W);
  const needH = newDef.heightUnits * RACK_U_PX;
  const rackTop = rackPosition.y;
  const rackBottom = rackTop + RACK_HEIGHT_PX;
  const maxY = Math.max(rackTop, rackBottom - needH);

  const bayLeft = rackPosition.x + RACK_WOOD_PANEL_W;
  const bayRight = rackPosition.x + RACK_OUTER_W - RACK_WOOD_PANEL_W;

  const occupied: { top: number; bottom: number }[] = [];
  for (const n of nodes) {
    const d = defs.find((e) => e.id === n.defId);
    if (!d || d.heightUnits <= 0) continue;
    const cx = n.x + d.width * 0.5;
    if (cx < bayLeft - 12 || cx > bayRight + 12) continue;
    const top = n.y;
    const bottom = n.y + d.heightUnits * RACK_U_PX;
    occupied.push({ top, bottom });
  }

  for (let y = rackTop; y <= maxY; y += RACK_U_PX) {
    const y1 = y + needH;
    const hit = occupied.some((o) => yRangesOverlap(y, y1, o.top, o.bottom));
    if (!hit) return { x: colX, y };
  }

  return null;
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
  rackOuterLeft: number,
  defs: EquipmentDef[]
): { x: number; y: number } {
  const pad = 28;
  const cellW = Math.max(200, def.width + 32);
  const cellH = 130;
  const stageRight = rackOuterLeft - STAGE_RACK_GAP_PX - pad;
  const aw = def.width;
  const ah = def.heightUnits > 0 ? def.heightUnits * 44 : 100;

  const candidateBoxes = nodes
    .map((n) => nodeBounds(n, defs))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .filter((b) => b.x + b.w * 0.5 < rackOuterLeft - STAGE_RACK_GAP_PX);

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
