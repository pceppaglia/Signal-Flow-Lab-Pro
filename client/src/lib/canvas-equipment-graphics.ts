/**
 * Signal Flow Lab Pro - Robust Hardware Graphics Engine
 */

import type { EquipmentNode } from '../../../shared/equipment-types';
import { getEquipmentById } from './equipment-library';

export interface GraphicsContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
  isSelected: boolean;
  isHovered: boolean;
  node: EquipmentNode;
}

// ─── HIGH-FIDELITY RENDERING HELPERS ───

function drawBakeliteKnob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, value: number, label: string) {
  const grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 0, cx, cy, r);
  grad.addColorStop(0, '#333');
  grad.addColorStop(1, '#080808');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const angle = (value * 270 - 135) * (Math.PI / 180);
  ctx.strokeStyle = '#E8A020'; // Brand Amber
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * (r * 0.3), cy + Math.sin(angle) * (r * 0.3));
  ctx.lineTo(cx + Math.cos(angle) * (r * 0.8), cy + Math.sin(angle) * (r * 0.8));
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), cx, cy + r + 12);
}

function drawAnalogVU(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number) {
  ctx.fillStyle = '#f5f0e0'; // Aged paper
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(x, y, w, h);

  const normLevel = Math.max(0, Math.min(1, (level + 40) / 45));
  const angle = -Math.PI * 0.75 + (normLevel * Math.PI * 0.5);
  
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w/2, y + h * 0.9);
  ctx.lineTo(x + w/2 + Math.cos(angle) * (h * 0.7), y + h * 0.9 + Math.sin(angle) * (h * 0.7));
  ctx.stroke();
}

// ─── EQUIPMENT RENDERERS ───

export const equipmentGraphics: Record<string, (gc: GraphicsContext) => void> = {
  
  'pultec-eqp1a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    ctx.fillStyle = '#2b2d35'; // Pultec Blue
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PULTEC EQP-1A', x + 10, y + 20);
    drawBakeliteKnob(ctx, x + 50, y + 70, 18, (node.settings['lf-boost'] as number || 0) / 10, 'Boost');
    drawBakeliteKnob(ctx, x + 100, y + 70, 18, (node.settings['lf-atten'] as number || 0) / 10, 'Atten');
  },

  'u87': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h } = gc;
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#888'); grad.addColorStop(0.5, '#ddd'); grad.addColorStop(1, '#888');
    ctx.fillStyle = grad;
    ctx.fillRect(x + w/4, y + 20, w/2, h - 30); // Body
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(x + w/2, y + 20, w/4, Math.PI, 0); ctx.fill(); // Head
  },

  // Fallback for any microphone category
  'generic-mic': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    ctx.fillStyle = '#333';
    ctx.fillRect(x + w/3, y + 10, w/3, h - 20);
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(x + w/2, y + 15, w/4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(node.defId.toUpperCase(), x + w/2, y + h - 5);
  }
};

/** Main Graphics Dispatcher */
export function renderEquipmentGraphics(gc: GraphicsContext) {
  const { node } = gc;
  const def = getEquipmentById(node.defId);
  
  // Try specific ID first, then fallback to category, then absolute fallback
  let renderer = equipmentGraphics[node.defId];
  if (!renderer && def?.category === 'microphone') renderer = equipmentGraphics['generic-mic'];

  if (renderer) {
    renderer(gc);
  } else {
    // HIGH-CONTRAST FALLBACK (Visible on dark backgrounds)
    const { ctx, x, y, w, h } = gc;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#E8A020'; // Bright Orange Border
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#E8A020';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(node.defId.toUpperCase(), x + w/2, y + h/2);
  }
}