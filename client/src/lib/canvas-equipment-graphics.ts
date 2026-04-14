/**
 * Canvas 2D Graphics Rendering for Professional Audio Equipment
 * Renders photorealistic faceplate graphics for each piece of gear
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

// Helper functions for common UI elements
function drawKnob(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, value: number, label: string) {
  // Knob background
  const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
  grad.addColorStop(0, '#444');
  grad.addColorStop(0.5, '#222');
  grad.addColorStop(1, '#111');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Knob border
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Indicator line
  const angle = (value * 270 - 135) * (Math.PI / 180);
  const lineLen = radius * 0.7;
  ctx.strokeStyle = '#E8A020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * lineLen, cy + Math.sin(angle) * lineLen);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#AAA';
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + radius + 12);
}

function drawFader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, value: number, label: string) {
  // Track
  ctx.fillStyle = '#111';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Fader position
  const faderY = y + h * (1 - value);
  ctx.fillStyle = '#E8A020';
  ctx.fillRect(x - 2, faderY - 4, w + 4, 8);

  // Label
  ctx.fillStyle = '#AAA';
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y - 5);
}

function drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isActive: boolean, label: string) {
  // Button background
  ctx.fillStyle = isActive ? '#E8A020' : '#222';
  ctx.fillRect(x, y, w, h);

  // Button border
  ctx.strokeStyle = isActive ? '#FFD700' : '#555';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Label
  ctx.fillStyle = isActive ? '#000' : '#AAA';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function drawMeter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number) {
  // Meter background
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Meter level
  const levelNormalized = Math.max(0, Math.min(1, (level + 60) / 84));
  const meterHeight = levelNormalized * h;
  ctx.fillStyle = level > 4 ? '#C0392B' : '#4CAF50';
  ctx.fillRect(x, y + h - meterHeight, w, meterHeight);
}

// Equipment-specific renderers
export const equipmentGraphics: Record<string, (gc: GraphicsContext) => void> = {
  // Pultec EQP-1A
  'pultec-eqp-1a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate background
    const faceGrad = ctx.createLinearGradient(x, y, x, y + h);
    faceGrad.addColorStop(0, '#2a2a2a');
    faceGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(x, y, w, h);

    // Gold accent bar
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(x, y, w, 3);

    // Brand/model text
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PULTEC', x + w / 2, y + 20);
    ctx.font = '9px Arial';
    ctx.fillText('EQP-1A', x + w / 2, y + 32);

    // Input/Output ports
    ctx.fillStyle = '#E8A020';
    ctx.beginPath();
    ctx.arc(x + 8, y + 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 8, y + 20, 3, 0, Math.PI * 2);
    ctx.fill();

    // Low frequency section
    ctx.fillStyle = '#AAA';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LOW', x + 10, y + 50);
    drawKnob(ctx, x + 20, y + 70, 12, 0.5, 'Freq');
    drawKnob(ctx, x + 50, y + 70, 12, 0.5, 'Boost');

    // Mid frequency section
    ctx.fillText('MID', x + 10, y + 100);
    drawKnob(ctx, x + 20, y + 120, 12, 0.5, 'Freq');
    drawKnob(ctx, x + 50, y + 120, 12, 0.5, 'Gain');

    // High frequency section
    ctx.fillText('HIGH', x + 10, y + 150);
    drawKnob(ctx, x + 20, y + 170, 12, 0.5, 'Freq');
    drawKnob(ctx, x + 50, y + 170, 12, 0.5, 'Boost');

    // Output meter
    drawMeter(ctx, x + w - 30, y + 50, 15, 120, node.signalLevels[node.defId] ?? -100);
  },

  // Neve 1073 Preamp
  'neve-1073': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate
    const faceGrad = ctx.createLinearGradient(x, y, x, y + h);
    faceGrad.addColorStop(0, '#1a1a1a');
    faceGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(x, y, w, h);

    // Red accent bar
    ctx.fillStyle = '#CC0000';
    ctx.fillRect(x, y, w, 4);

    // Brand
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NEVE', x + w / 2, y + 22);
    ctx.font = 'bold 11px Arial';
    ctx.fillText('1073', x + w / 2, y + 38);

    // Gain section
    ctx.fillStyle = '#CCC';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('GAIN', x + 10, y + 55);
    drawKnob(ctx, x + 25, y + 75, 14, 0.5, 'dB');

    // Phantom power button
    const phantomActive = node.settings.phantomPower as boolean;
    drawButton(ctx, x + 60, y + 60, 35, 20, phantomActive, '+48V');

    // HPF button
    const hpfActive = node.settings.hpfEnabled as boolean;
    drawButton(ctx, x + 60, y + 85, 35, 20, hpfActive, 'HPF');

    // 3-band EQ
    ctx.fillText('EQ', x + 10, y + 110);
    drawKnob(ctx, x + 20, y + 135, 11, 0.5, 'Low');
    drawKnob(ctx, x + 45, y + 135, 11, 0.5, 'Mid');
    drawKnob(ctx, x + 70, y + 135, 11, 0.5, 'High');

    // Output meter
    drawMeter(ctx, x + w - 25, y + 50, 12, 130, node.signalLevels[node.defId] ?? -100);
  },

  // API 512c Preamp
  'api-512c': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);

    // Blue accent
    ctx.fillStyle = '#0066CC';
    ctx.fillRect(x, y, w, 3);

    // Brand
    ctx.fillStyle = '#0066CC';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('API', x + w / 2, y + 22);
    ctx.font = 'bold 10px Arial';
    ctx.fillText('512c', x + w / 2, y + 36);

    // Gain
    ctx.fillStyle = '#CCC';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('GAIN', x + 8, y + 52);
    drawKnob(ctx, x + 20, y + 72, 13, 0.5, 'dB');

    // Polarity switch
    const polarityActive = node.settings.polarity as boolean;
    drawButton(ctx, x + 50, y + 60, 30, 18, polarityActive, 'Ø');

    // Phantom power
    const phantomActive = node.settings.phantomPower as boolean;
    drawButton(ctx, x + 50, y + 82, 30, 18, phantomActive, '+48V');

    // Output meter
    drawMeter(ctx, x + w - 22, y + 50, 10, 120, node.signalLevels[node.defId] ?? -100);
  },

  // UREI 1176 Compressor
  'urei-1176': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate
    const faceGrad = ctx.createLinearGradient(x, y, x, y + h);
    faceGrad.addColorStop(0, '#2a2a2a');
    faceGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(x, y, w, h);

    // Silver accent
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(x, y, w, 3);

    // Brand
    ctx.fillStyle = '#C0C0C0';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('UREI 1176', x + w / 2, y + 22);

    // Input/Output meters
    drawMeter(ctx, x + 8, y + 40, 12, 100, node.signalLevels[node.defId] ?? -100);
    drawMeter(ctx, x + w - 20, y + 40, 12, 100, node.signalLevels[node.defId] ?? -100);

    // Threshold
    ctx.fillStyle = '#AAA';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('THRESHOLD', x + w / 2, y + 150);
    drawKnob(ctx, x + w / 2 - 15, y + 170, 11, 0.5, 'dB');

    // Ratio
    ctx.fillText('RATIO', x + w / 2 + 15, y + 150);
    drawKnob(ctx, x + w / 2 + 15, y + 170, 11, 0.5, ':1');
  },

  // Teletronix LA-2A
  'teletronix-la-2a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);

    // Gold accent
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(x, y, w, 3);

    // Brand
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TELETRONIX', x + w / 2, y + 22);
    ctx.font = 'bold 10px Arial';
    ctx.fillText('LA-2A', x + w / 2, y + 36);

    // Gain reduction meter
    drawMeter(ctx, x + 10, y + 50, 15, 100, node.signalLevels[node.defId] ?? -100);

    // Peak level indicator
    ctx.fillStyle = '#E8A020';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PEAK', x + 17, y + 160);

    // Gain and Threshold knobs
    drawKnob(ctx, x + 45, y + 80, 12, 0.5, 'Gain');
    drawKnob(ctx, x + 45, y + 130, 12, 0.5, 'Thresh');

    // Mode button
    drawButton(ctx, x + 75, y + 70, 30, 20, false, 'COMP');
  },

  // SSL Bus Compressor
  'ssl-bus-compressor': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, w, h);

    // Black accent
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, 3);

    // Brand
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SSL', x + w / 2, y + 22);
    ctx.font = 'bold 9px Arial';
    ctx.fillText('BUS COMP', x + w / 2, y + 36);

    // Input/Output meters
    drawMeter(ctx, x + 8, y + 50, 10, 90, node.signalLevels[node.defId] ?? -100);
    drawMeter(ctx, x + w - 18, y + 50, 10, 90, node.signalLevels[node.defId] ?? -100);

    // Threshold
    drawKnob(ctx, x + 30, y + 75, 11, 0.5, 'Thresh');
    // Ratio
    drawKnob(ctx, x + 30, y + 125, 11, 0.5, 'Ratio');
    // Makeup
    drawKnob(ctx, x + 60, y + 75, 11, 0.5, 'Makeup');
  },

  // Lexicon 480L Reverb
  'lexicon-480l': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Faceplate
    const faceGrad = ctx.createLinearGradient(x, y, x, y + h);
    faceGrad.addColorStop(0, '#1a1a1a');
    faceGrad.addColorStop(1, '#000');
    ctx.fillStyle = faceGrad;
    ctx.fillRect(x, y, w, h);

    // Blue accent
    ctx.fillStyle = '#0099FF';
    ctx.fillRect(x, y, w, 3);

    // Brand
    ctx.fillStyle = '#0099FF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LEXICON', x + w / 2, y + 22);
    ctx.font = 'bold 10px Arial';
    ctx.fillText('480L', x + w / 2, y + 36);

    // Display area
    ctx.fillStyle = '#001a00';
    ctx.fillRect(x + 10, y + 50, w - 20, 30);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 10, y + 50, w - 20, 30);
    ctx.fillStyle = '#00FF00';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REVERB', x + 15, y + 68);

    // Algorithm selector
    drawButton(ctx, x + 15, y + 90, 25, 15, false, 'Hall');
    drawButton(ctx, x + 45, y + 90, 25, 15, true, 'Plate');
    drawButton(ctx, x + 75, y + 90, 25, 15, false, 'Room');

    // Decay time knob
    drawKnob(ctx, x + 30, y + 130, 12, 0.5, 'Decay');
    // Mix knob
    drawKnob(ctx, x + 70, y + 130, 12, 0.5, 'Mix');
  },

  // Generic microphone
  'microphone': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Mic body (cylindrical)
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 5, y + 10, w - 10, h - 20);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 10, w - 10, h - 20);

    // Mic capsule (top)
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 10, (w - 10) / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mesh
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#444';
      ctx.fillRect(x + 8, y + 20 + i * 8, w - 16, 6);
    }

    // Brand
    ctx.fillStyle = '#AAA';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.defId.split('-')[0].toUpperCase(), x + w / 2, y + h - 5);

    // Output port
    ctx.fillStyle = '#E8A020';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  // Generic speaker/monitor
  'speaker': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;

    // Cabinet
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Woofer
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 + 10, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tweeter
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 15, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Brand
    ctx.fillStyle = '#AAA';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(node.defId.split('-')[0].toUpperCase(), x + w / 2, y + h - 5);
  },
};

export function renderEquipmentGraphics(gc: GraphicsContext) {
  const { node } = gc;
  const renderer = equipmentGraphics[node.defId] || equipmentGraphics['microphone'];
  renderer(gc);
}
