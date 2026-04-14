/**
 * Signal Flow Lab Pro - High-Fidelity Hardware Graphics Engine
 * Implementing SoundcheckPro / AudioFusion level skeuomorphism
 */

import type { EquipmentNode } from '../../../shared/equipment-types';

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

// ─── SKEUOMORPHIC UI HELPERS ───

function drawBrushedMetal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, baseColor: string) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, w, h);
  
  // Add fine metallic grain
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < w; i += 1.5) {
    ctx.fillStyle = i % 3 === 0 ? '#fff' : '#000';
    ctx.fillRect(x + i, y, 0.5, h);
  }
  ctx.restore();

  // Beveled Edge
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function drawVUMeter(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, value: number) {
  // Meter Housing
  const grad = ctx.createLinearGradient(cx - w/2, cy - h/2, cx - w/2, cy + h/2);
  grad.addColorStop(0, '#1a1a1a');
  grad.addColorStop(1, '#333');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(cx - w/2, cy - h/2, w, h, 4);
  ctx.fill();

  // Backlight / Paper
  const paperGrad = ctx.createRadialGradient(cx, cy + 20, 10, cx, cy + 20, 60);
  paperGrad.addColorStop(0, '#fdfcf0'); // Warm bulb glow
  paperGrad.addColorStop(1, '#dcd8c0');
  ctx.fillStyle = paperGrad;
  ctx.beginPath();
  ctx.roundRect(cx - w/2 + 5, cy - h/2 + 5, w - 10, h - 10, 2);
  ctx.fill();

  // Scale lines (simplified)
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  for (let a = -45; a <= 45; a += 10) {
    const rad = (a - 90) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * 35, cy + 40 + Math.sin(rad) * 35);
    ctx.lineTo(cx + Math.cos(rad) * 45, cy + 40 + Math.sin(rad) * 45);
    ctx.stroke();
  }

  // Needle
  const angle = (value * 90 - 45 - 90) * (Math.PI / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = '#c00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 35);
  ctx.lineTo(cx + Math.cos(angle) * 50, cy + 35 + Math.sin(angle) * 50);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawAnalogKnob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, value: number, label: string) {
  // Knob shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  // Knob body
  const kGrad = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 0, cx, cy, r);
  kGrad.addColorStop(0, '#444');
  kGrad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = kGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pointer line
  const angle = (value * 270 - 135 - 90) * (Math.PI / 180);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * (r * 0.4), cy + Math.sin(angle) * (r * 0.4));
  ctx.lineTo(cx + Math.cos(angle) * (r * 0.9), cy + Math.sin(angle) * (r * 0.9));
  ctx.stroke();

  // Text label
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 8px "Inter"';
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), cx, cy + r + 15);
}

// ─── EQUIPMENT RENDERERS ───

export const equipmentGraphics: Record<string, (gc: GraphicsContext) => void> = {
  
  'pk-2a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    
    // Main Faceplate (Silver/Nickel)
    drawBrushedMetal(ctx, x, y, w, h, '#c0c0c8');

    // Brand Label
    ctx.fillStyle = '#800';
    ctx.font = 'italic bold 20px serif';
    ctx.fillText('PK-2A', x + 30, y + 45);
    ctx.strokeStyle = '#800';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x+30, y+50); ctx.lineTo(x+100, y+50); ctx.stroke();

    // Components
    drawVUMeter(ctx, x + w/2, y + h/2 - 10, 100, 70, 0.4);
    drawAnalogKnob(ctx, x + 130, y + h/2 + 20, 22, (node.settings.gain as number || 0)/100, 'GAIN');
    drawAnalogKnob(ctx, x + w - 130, y + h/2 + 20, 22, (node.settings.reduction as number || 0)/100, 'PEAK REDUCTION');

    // Switches
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x + 50, y + h - 40, 6, 0, Math.PI*2); ctx.fill(); // Toggle base
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 48, y + h - 55, 4, 15); // Toggle lever
  },

  'pultec-eqp1a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    
    // Classic Pultec Blue/Purple
    drawBrushedMetal(ctx, x, y, w, h, '#2a303b');

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px serif';
    ctx.fillText('PULTEC', x + 25, y + 30);
    ctx.font = 'italic 8px serif';
    ctx.fillText('PROGRAM EQUALIZER EQP-1A', x + 25, y + 42);

    // Row of knobs
    const knobY = y + h/2 + 10;
    drawAnalogKnob(ctx, x + 60, knobY, 18, (node.settings['lf-boost'] as number || 0)/10, 'LF BOOST');
    drawAnalogKnob(ctx, x + 120, knobY, 18, (node.settings['lf-atten'] as number || 0)/10, 'LF ATTEN');
    drawAnalogKnob(ctx, x + 180, knobY, 18, (node.settings['hf-boost'] as number || 0)/10, 'HF BOOST');
    drawAnalogKnob(ctx, x + 240, knobY, 18, (node.settings['hf-atten'] as number || 0)/10, 'HF ATTEN');
  },

  'u87': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h } = gc;
    const cx = x + w/2;

    // Body Nickel Finish
    const bodyGrad = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    bodyGrad.addColorStop(0, '#999');
    bodyGrad.addColorStop(0.5, '#eee');
    bodyGrad.addColorStop(1, '#999');
    
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 15, y + 45);
    ctx.lineTo(cx + 15, y + 45);
    ctx.lineTo(cx + 10, y + h - 5);
    ctx.lineTo(cx - 10, y + h - 5);
    ctx.closePath();
    ctx.fill();

    // Mesh Headgrille
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(cx - 18, y + 5, 36, 40, 10);
    ctx.fill();
    
    // Mesh Pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for(let i=0; i<36; i+=2) {
        ctx.beginPath(); ctx.moveTo(cx - 18 + i, y + 5); ctx.lineTo(cx - 18 + i, y + 45); ctx.stroke();
    }

    // Badge
    ctx.fillStyle = '#a00';
    ctx.beginPath(); ctx.arc(cx, y + 60, 4, 0, Math.PI*2); ctx.fill();
  }
};

export function renderEquipmentGraphics(gc: GraphicsContext) {
  const renderer = equipmentGraphics[gc.node.defId];
  if (renderer) {
    renderer(gc);
  } else {
    // Generic Rack Unit
    drawBrushedMetal(gc.ctx, gc.x, gc.y, gc.w, gc.h, '#1a1a1a');
    gc.ctx.fillStyle = '#E8A020';
    gc.ctx.font = 'bold 10px Inter';
    gc.ctx.textAlign = 'center';
    gc.ctx.fillText(gc.node.defId.toUpperCase(), gc.x + gc.w/2, gc.y + gc.h/2);
  }
}