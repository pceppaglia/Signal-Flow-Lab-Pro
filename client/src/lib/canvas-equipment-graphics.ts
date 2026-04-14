/**
 * Signal Flow Lab Pro - High-Fidelity Hardware Graphics Engine
 * Photorealistic 2D rendering for professional audio hardware
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

// ─── HIGH-FIDELITY RENDERING HELPERS ───

/** Draws a vintage Bakelite knob (Pultec, LA-2A, 1176 style) */
function drawBakeliteKnob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, value: number, label: string) {
  // Main body shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  // Knob base
  const grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 0, cx, cy, r);
  grad.addColorStop(0, '#333');
  grad.addColorStop(1, '#080808');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Bevel highlight
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pointer indicator (White line)
  const angle = (value * 270 - 135) * (Math.PI / 180);
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * (r * 0.4), cy + Math.sin(angle) * (r * 0.4));
  ctx.lineTo(cx + Math.cos(angle) * (r * 0.85), cy + Math.sin(angle) * (r * 0.85));
  ctx.stroke();

  // Small detail ring
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Label text
  ctx.fillStyle = '#bbb';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label.toUpperCase(), cx, cy + r + 14);
}

/** Draws a machined aluminum knob (API, Neve, SSL style) */
function drawMachinedKnob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, value: number, color: string = '#444') {
  // Outer cap
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, '#eee');
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, '#111');
  
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Pointer line
  const angle = (value * 270 - 135) * (Math.PI / 180);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r - 2), cy + Math.sin(angle) * (r - 2));
  ctx.stroke();
}

/** Draws a vintage analog VU meter with a real-time needle */
function drawAnalogVU(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, level: number) {
  // Meter background (Aged paper color)
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x, y, w, h);
  
  // Backlit glow
  const glow = ctx.createRadialGradient(x + w/2, y + h, 0, x + w/2, y + h, h * 1.5);
  glow.addColorStop(0, 'rgba(255, 230, 150, 0.2)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  // Scale lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + w/2, y + h * 1.2, h, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.stroke();

  // Red zone
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + w/2, y + h * 1.2, h - 2, -Math.PI * 0.35, -Math.PI * 0.2);
  ctx.stroke();

  // Needle logic (normalized level -60 to +3)
  const normLevel = Math.max(0, Math.min(1, (level + 30) / 33));
  const angle = -Math.PI * 0.75 + (normLevel * Math.PI * 0.5);
  
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w/2, y + h * 1.2);
  ctx.lineTo(x + w/2 + Math.cos(angle) * (h * 0.9), y + h * 1.2 + Math.sin(angle) * (h * 0.9));
  ctx.stroke();

  // Mirror effect / glass
  const glass = ctx.createLinearGradient(x, y, x + w, y + h);
  glass.addColorStop(0, 'rgba(255,255,255,0.1)');
  glass.addColorStop(0.5, 'rgba(255,255,255,0)');
  glass.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = glass;
  ctx.fillRect(x, y, w, h);

  // Frame
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

/** Draws a vintage jewel lamp / power light */
function drawJewelLamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, isActive: boolean) {
  // Lamp base (metal ring)
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  // Lamp glass
  const grad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 6);
  if (isActive) {
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, '#000');
    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
  } else {
    grad.addColorStop(0, '#444');
    grad.addColorStop(1, '#111');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ─── EQUIPMENT-SPECIFIC RENDERERS ───

export const equipmentGraphics: Record<string, (gc: GraphicsContext) => void> = {
  
  /** PULTEC EQP-1A */
  'pultec-eqp1a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    // Blue-Grey Textured Faceplate
    ctx.fillStyle = '#2b2d35';
    ctx.fillRect(x, y, w, h);
    
    // Branding
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 16px "Inter"';
    ctx.fillText('PULTEC', x + 30, y + 25);
    ctx.font = '10px "Inter"';
    ctx.fillText('PROGRAM EQUALIZER EQP-1A', x + 30, y + 38);

    // Controls
    drawBakeliteKnob(ctx, x + 60, y + 80, 22, (node.settings['lf-boost'] as number) / 10, 'Boost');
    drawBakeliteKnob(ctx, x + 120, y + 80, 22, (node.settings['lf-atten'] as number) / 10, 'Atten');
    
    // Jewel lamp (Power)
    drawJewelLamp(ctx, x + w - 30, y + 30, '#cc0000', true);
  },

  /** TELETRONIX LA-2A */
  'la2a': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    // Grey Powder Coat
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(x, y, w, h);
    
    // VU Meter
    drawAnalogVU(ctx, x + 30, y + 30, 80, 50, (node.signalLevels['la2a'] || -60));

    // Large Knobs
    drawBakeliteKnob(ctx, x + 140, y + 60, 30, (node.settings['gain'] as number) / 100, 'Gain');
    drawBakeliteKnob(ctx, x + 220, y + 60, 30, (node.settings['peak-reduction'] as number) / 100, 'Peak Reduction');

    // Teletronix Plate
    ctx.fillStyle = '#222';
    ctx.fillRect(x + w - 100, y + h - 40, 80, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Inter"';
    ctx.fillText('LA-2A', x + w - 70, y + h - 20);
  },

  /** ROLAND SPACE ECHO RE-201 */
  'tape-delay': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    // Black / Green enclosure
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, w, h);
    
    // Green Panel
    ctx.fillStyle = '#2d4d3d';
    ctx.fillRect(x + 10, y + 40, w - 20, h - 50);

    // Tape Window
    ctx.fillStyle = '#111';
    ctx.fillRect(x + 20, y + 10, 100, 25);
    ctx.strokeStyle = '#4CAF50';
    ctx.strokeRect(x + 20, y + 10, 100, 25);
    ctx.fillStyle = '#4CAF50';
    ctx.font = '10px monospace';
    ctx.fillText('RE-201 TAPE LOOP', x + 25, y + 25);

    // Knobs
    drawBakeliteKnob(ctx, x + 40, y + 80, 16, (node.settings['delay-time'] as number) / 1000, 'Repeat Rate');
    drawBakeliteKnob(ctx, x + 90, y + 80, 16, (node.settings['feedback'] as number) / 100, 'Intensity');
    drawBakeliteKnob(ctx, x + 140, y + 80, 16, (node.settings['mix'] as number) / 100, 'Echo Vol');
  },

  /** NEUMANN U87 MICROPHONE */
  'u87': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h } = gc;
    // Nickel cylindrical body
    const micGrad = ctx.createLinearGradient(x, y, x + w, y);
    micGrad.addColorStop(0, '#777');
    micGrad.addColorStop(0.5, '#ddd');
    micGrad.addColorStop(1, '#777');
    
    ctx.fillStyle = micGrad;
    ctx.fillRect(x + w/4, y + 30, w/2, h - 40);

    // Head basket (Mesh)
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(x + w/4, y + 30);
    ctx.quadraticCurveTo(x + w/2, y - 10, x + (3*w)/4, y + 30);
    ctx.fill();
    
    // Mesh crosshatch
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for(let i=0; i<10; i++) {
        ctx.beginPath(); ctx.moveTo(x+w/4, y+3+i*3); ctx.lineTo(x+(3*w)/4, y+3+i*3); ctx.stroke();
    }

    // Pattern Switch
    ctx.fillStyle = '#222';
    ctx.fillRect(x + w/2 - 10, y + 40, 20, 10);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Inter"';
    ctx.fillText('PATTERN', x + w/2 - 20, y + 55);
  },

  /** YAMAHA NS-10M STUDIO MONITOR */
  'monitor-speaker': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h } = gc;
    // Black cabinet
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(x, y, w, h);

    // The iconic white woofer
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + w/2, y + (3*h)/4, w * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // Black center cap
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + w/2, y + (3*h)/4, w * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Tweeter
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/4, w * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Yamaha Logo
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Inter"';
    ctx.fillText('YAMAHA', x + 10, y + 15);
  },

  /** NEVE 1073 PREAMP */
  'neve-1073': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    // RAF Blue-Grey
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(x, y, w, h);

    // Maroon Gain Knob
    drawMachinedKnob(ctx, x + w/2, y + 60, 24, (node.settings['gain'] as number) / 80, '#880000');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "Inter"';
    ctx.fillText('GAIN dB', x + w/2 - 20, y + 95);

    // Switches
    drawJewelLamp(ctx, x + 30, y + 130, '#ff4400', node.settings['phantom'] as boolean);
    ctx.fillText('48V', x + 22, y + 150);
  },

  /** API 512 PREAMP */
  'api-512': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h, node } = gc;
    // Machined Black
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, w, h);
    
    // Blue Accent
    ctx.fillStyle = '#0055aa';
    ctx.fillRect(x, y, w, 5);

    // Aluminum Knob
    drawMachinedKnob(ctx, x + w/2, y + 60, 20, (node.settings['gain'] as number) / 65, '#555');
    
    // API Logo
    ctx.fillStyle = '#0055aa';
    ctx.font = 'bold 18px "Impact"';
    ctx.fillText('API', x + 15, y + 25);
  },

  /** UNIVERSAL AUDIO APOLLO x8 */
  'daw-interface': (gc: GraphicsContext) => {
    const { ctx, x, y, w, h } = gc;
    // Brushed Slate
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    
    // Glowing UA Logo
    drawJewelLamp(ctx, x + 25, y + 25, '#ffffff', true);
    
    // LED Segment Meters
    for(let i=0; i<8; i++) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 60 + (i*15), y + 40, 8, 40);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x + 60 + (i*15), y + 50, 8, 20); // Static green segments
    }

    ctx.fillStyle = '#555';
    ctx.font = 'bold 12px "Inter"';
    ctx.fillText('UNIVERSAL AUDIO', x + w - 120, y + 25);
  }
};

/** Main Graphics Dispatcher */
export function renderEquipmentGraphics(gc: GraphicsContext) {
  const { node } = gc;
  const renderer = equipmentGraphics[node.defId];
  
  if (renderer) {
    renderer(gc);
  } else {
    // Fallback: Generic rack unit style
    const { ctx, x, y, w, h } = gc;
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Inter"';
    ctx.fillText(node.defId.toUpperCase(), x + 10, y + 20);
  }
}