/**
 * Canvas 2D Rendering Engine for Photorealistic Audio Equipment
 * Handles all drawing of equipment, faders, knobs, meters, and visual elements
 */

export interface CanvasRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

// Color palette matching RecordingStudio.com branding
export const COLORS = {
  // Backgrounds
  darkBg: '#1a1a1a',
  consoleBg: '#2d2d2d',
  panelBg: '#3a3a3a',
  
  // Accents
  amber: '#d4a574',
  amberLight: '#e8c4a0',
  amberDark: '#8b6f47',
  
  // Equipment colors
  metalDark: '#4a4a4a',
  metalLight: '#6a6a6a',
  metalBright: '#8a8a8a',
  
  // Signal levels
  green: '#2ecc71',
  yellow: '#f1c40f',
  red: '#e74c3c',
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  textDim: '#707070',
};

/**
 * Draw a photorealistic equipment piece with metallic finish
 */
export function drawEquipment(
  ctx: CanvasRenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  equipment: {
    name: string;
    brand: string;
    type: string;
    color?: string;
    hasPhantom?: boolean;
    isClipping?: boolean;
  }
) {
  const { ctx: canvas, scale } = ctx;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledW = width * scale;
  const scaledH = height * scale;

  // Draw outer shadow
  canvas.shadowColor = 'rgba(0, 0, 0, 0.8)';
  canvas.shadowBlur = 15 * scale;
  canvas.shadowOffsetX = 3 * scale;
  canvas.shadowOffsetY = 3 * scale;

  // Draw main equipment body with gradient
  const gradient = canvas.createLinearGradient(scaledX, scaledY, scaledX, scaledY + scaledH);
  gradient.addColorStop(0, COLORS.metalLight);
  gradient.addColorStop(0.5, COLORS.metalDark);
  gradient.addColorStop(1, '#1a1a1a');

  canvas.fillStyle = gradient;
  canvas.fillRect(scaledX, scaledY, scaledW, scaledH);

  // Draw accent bar at top
  canvas.fillStyle = COLORS.amber;
  canvas.fillRect(scaledX, scaledY, scaledW, 8 * scale);

  // Draw border
  canvas.strokeStyle = COLORS.amberDark;
  canvas.lineWidth = 2 * scale;
  canvas.strokeRect(scaledX, scaledY, scaledW, scaledH);

  // Draw brand/model text
  canvas.fillStyle = COLORS.textSecondary;
  canvas.font = `${10 * scale}px 'Inter', sans-serif`;
  canvas.textAlign = 'center';
  canvas.fillText(equipment.brand, scaledX + scaledW / 2, scaledY + 20 * scale);

  canvas.fillStyle = COLORS.textPrimary;
  canvas.font = `bold ${14 * scale}px 'Bebas Neue', sans-serif`;
  canvas.fillText(equipment.name.toUpperCase(), scaledX + scaledW / 2, scaledY + scaledH / 2);

  // Draw phantom power indicator if applicable
  if (equipment.hasPhantom) {
    canvas.fillStyle = COLORS.amber;
    canvas.font = `${8 * scale}px 'Consolas', monospace`;
    canvas.textAlign = 'right';
    canvas.fillText('+48V', scaledX + scaledW - 8 * scale, scaledY + scaledH - 8 * scale);
  }

  // Draw clipping indicator if active
  if (equipment.isClipping) {
    canvas.fillStyle = COLORS.red;
    canvas.beginPath();
    canvas.arc(scaledX + scaledW - 12 * scale, scaledY + 12 * scale, 4 * scale, 0, Math.PI * 2);
    canvas.fill();
  }

  // Draw connection ports
  drawPorts(ctx, scaledX, scaledY, scaledW, scaledH, equipment.type);

  // Reset shadow
  canvas.shadowColor = 'transparent';
}

/**
 * Draw connection ports (input/output circles)
 */
function drawPorts(
  ctx: CanvasRenderContext,
  x: number,
  y: number,
  w: number,
  h: number,
  equipmentType: string
) {
  const { ctx: canvas, scale } = ctx;
  const portRadius = 4 * scale;

  // Left side ports (inputs)
  canvas.fillStyle = COLORS.red;
  canvas.beginPath();
  canvas.arc(x, y + h / 2 - 12 * scale, portRadius, 0, Math.PI * 2);
  canvas.fill();

  // Right side ports (outputs)
  canvas.fillStyle = COLORS.green;
  canvas.beginPath();
  canvas.arc(x + w, y + h / 2 - 12 * scale, portRadius, 0, Math.PI * 2);
  canvas.fill();

  // Draw port labels
  canvas.fillStyle = COLORS.textDim;
  canvas.font = `${7 * scale}px 'Consolas', monospace`;
  canvas.textAlign = 'right';
  canvas.fillText('IN', x - 8 * scale, y + h / 2 - 8 * scale);
  canvas.textAlign = 'left';
  canvas.fillText('OUT', x + w + 8 * scale, y + h / 2 - 8 * scale);
}

/**
 * Draw a photorealistic fader with metallic finish
 */
export function drawFader(
  ctx: CanvasRenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number, // 0-1
  label?: string
) {
  const { ctx: canvas, scale } = ctx;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledW = width * scale;
  const scaledH = height * scale;

  // Draw track background
  canvas.fillStyle = COLORS.panelBg;
  canvas.fillRect(scaledX, scaledY, scaledW, scaledH);

  // Draw track border
  canvas.strokeStyle = COLORS.metalDark;
  canvas.lineWidth = 1 * scale;
  canvas.strokeRect(scaledX, scaledY, scaledW, scaledH);

  // Draw active track (filled portion)
  const filledHeight = scaledH * (1 - value); // Inverted for top-to-bottom
  canvas.fillStyle = COLORS.amber;
  canvas.fillRect(scaledX, scaledY, scaledW, filledHeight);

  // Draw fader knob
  const knobY = scaledY + filledHeight - (8 * scale) / 2;
  const knobGradient = canvas.createLinearGradient(scaledX, knobY, scaledX + scaledW, knobY);
  knobGradient.addColorStop(0, COLORS.metalBright);
  knobGradient.addColorStop(0.5, COLORS.metalLight);
  knobGradient.addColorStop(1, COLORS.metalDark);

  canvas.fillStyle = knobGradient;
  canvas.fillRect(scaledX, knobY, scaledW, 8 * scale);

  // Draw knob highlight
  canvas.strokeStyle = COLORS.amberLight;
  canvas.lineWidth = 1 * scale;
  canvas.strokeRect(scaledX + 1 * scale, knobY + 1 * scale, scaledW - 2 * scale, 6 * scale);

  // Draw label if provided
  if (label) {
    canvas.fillStyle = COLORS.textSecondary;
    canvas.font = `${8 * scale}px 'Inter', sans-serif`;
    canvas.textAlign = 'center';
    canvas.fillText(label, scaledX + scaledW / 2, scaledY - 4 * scale);
  }
}

/**
 * Draw a VU meter with needle
 */
export function drawVUMeter(
  ctx: CanvasRenderContext,
  x: number,
  y: number,
  size: number,
  value: number, // 0-1
  label?: string
) {
  const { ctx: canvas, scale } = ctx;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledSize = size * scale;

  // Draw meter background
  canvas.fillStyle = COLORS.panelBg;
  canvas.beginPath();
  canvas.arc(scaledX, scaledY, scaledSize / 2, 0, Math.PI * 2);
  canvas.fill();

  // Draw meter border
  canvas.strokeStyle = COLORS.metalDark;
  canvas.lineWidth = 2 * scale;
  canvas.stroke();

  // Draw scale markings
  canvas.strokeStyle = COLORS.textDim;
  canvas.lineWidth = 1 * scale;
  for (let i = 0; i <= 10; i++) {
    const angle = (Math.PI / 10) * i - Math.PI / 2;
    const x1 = scaledX + Math.cos(angle) * (scaledSize / 2 - 4 * scale);
    const y1 = scaledY + Math.sin(angle) * (scaledSize / 2 - 4 * scale);
    const x2 = scaledX + Math.cos(angle) * (scaledSize / 2 - 8 * scale);
    const y2 = scaledY + Math.sin(angle) * (scaledSize / 2 - 8 * scale);
    canvas.beginPath();
    canvas.moveTo(x1, y1);
    canvas.lineTo(x2, y2);
    canvas.stroke();
  }

  // Draw needle
  const needleAngle = (Math.PI / 10) * (value * 10) - Math.PI / 2;
  const needleLength = scaledSize / 2 - 12 * scale;
  const needleX = scaledX + Math.cos(needleAngle) * needleLength;
  const needleY = scaledY + Math.sin(needleAngle) * needleLength;

  canvas.strokeStyle = COLORS.red;
  canvas.lineWidth = 2 * scale;
  canvas.beginPath();
  canvas.moveTo(scaledX, scaledY);
  canvas.lineTo(needleX, needleY);
  canvas.stroke();

  // Draw needle center
  canvas.fillStyle = COLORS.metalBright;
  canvas.beginPath();
  canvas.arc(scaledX, scaledY, 3 * scale, 0, Math.PI * 2);
  canvas.fill();

  // Draw label
  if (label) {
    canvas.fillStyle = COLORS.textSecondary;
    canvas.font = `${8 * scale}px 'Inter', sans-serif`;
    canvas.textAlign = 'center';
    canvas.fillText(label, scaledX, scaledY + scaledSize / 2 + 12 * scale);
  }
}

/**
 * Draw a rotary knob
 */
export function drawKnob(
  ctx: CanvasRenderContext,
  x: number,
  y: number,
  size: number,
  value: number, // 0-1
  label?: string
) {
  const { ctx: canvas, scale } = ctx;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledSize = size * scale;

  // Draw knob body with gradient
  const gradient = canvas.createRadialGradient(
    scaledX - scaledSize / 6,
    scaledY - scaledSize / 6,
    0,
    scaledX,
    scaledY,
    scaledSize / 2
  );
  gradient.addColorStop(0, COLORS.metalBright);
  gradient.addColorStop(0.5, COLORS.metalLight);
  gradient.addColorStop(1, COLORS.metalDark);

  canvas.fillStyle = gradient;
  canvas.beginPath();
  canvas.arc(scaledX, scaledY, scaledSize / 2, 0, Math.PI * 2);
  canvas.fill();

  // Draw knob border
  canvas.strokeStyle = COLORS.amberDark;
  canvas.lineWidth = 1 * scale;
  canvas.stroke();

  // Draw indicator line
  const angle = (value * 270 - 135) * (Math.PI / 180); // 270 degree range
  const lineLength = scaledSize / 3;
  const lineX = scaledX + Math.cos(angle) * lineLength;
  const lineY = scaledY + Math.sin(angle) * lineLength;

  canvas.strokeStyle = COLORS.amber;
  canvas.lineWidth = 2 * scale;
  canvas.beginPath();
  canvas.moveTo(scaledX, scaledY);
  canvas.lineTo(lineX, lineY);
  canvas.stroke();

  // Draw label
  if (label) {
    canvas.fillStyle = COLORS.textSecondary;
    canvas.font = `${7 * scale}px 'Inter', sans-serif`;
    canvas.textAlign = 'center';
    canvas.fillText(label, scaledX, scaledY + scaledSize / 2 + 10 * scale);
  }
}

/**
 * Draw a cable between two points
 */
export function drawCable(
  ctx: CanvasRenderContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  signalType: 'audio' | 'control' | 'digital' = 'audio',
  isActive: boolean = true
) {
  const { ctx: canvas, scale } = ctx;

  const scaledFromX = fromX * scale;
  const scaledFromY = fromY * scale;
  const scaledToX = toX * scale;
  const scaledToY = toY * scale;

  // Determine cable color based on signal type
  let cableColor = COLORS.textDim;
  if (signalType === 'audio') cableColor = isActive ? COLORS.amber : COLORS.textDim;
  if (signalType === 'control') cableColor = isActive ? COLORS.green : COLORS.textDim;
  if (signalType === 'digital') cableColor = isActive ? COLORS.red : COLORS.textDim;

  // Draw cable with bezier curve
  canvas.strokeStyle = cableColor;
  canvas.lineWidth = 3 * scale;
  canvas.lineCap = 'round';
  canvas.lineJoin = 'round';

  const controlX = (scaledFromX + scaledToX) / 2;
  const controlY = (scaledFromY + scaledToY) / 2 + 30 * scale;

  canvas.beginPath();
  canvas.moveTo(scaledFromX, scaledFromY);
  canvas.quadraticCurveTo(controlX, controlY, scaledToX, scaledToY);
  canvas.stroke();

  // Draw connection points
  canvas.fillStyle = cableColor;
  canvas.beginPath();
  canvas.arc(scaledFromX, scaledFromY, 4 * scale, 0, Math.PI * 2);
  canvas.fill();

  canvas.beginPath();
  canvas.arc(scaledToX, scaledToY, 4 * scale, 0, Math.PI * 2);
  canvas.fill();
}

/**
 * Draw a channel strip (simplified mixer channel)
 */
export function drawChannelStrip(
  ctx: CanvasRenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  channel: {
    number: number;
    gain: number;
    pan: number;
    mute: boolean;
    solo: boolean;
    level: number;
    name?: string;
  }
) {
  const { ctx: canvas, scale } = ctx;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledW = width * scale;
  const scaledH = height * scale;

  // Draw channel background
  const gradient = canvas.createLinearGradient(scaledX, scaledY, scaledX, scaledY + scaledH);
  gradient.addColorStop(0, COLORS.metalLight);
  gradient.addColorStop(1, COLORS.metalDark);

  canvas.fillStyle = gradient;
  canvas.fillRect(scaledX, scaledY, scaledW, scaledH);

  // Draw channel border
  canvas.strokeStyle = channel.solo ? COLORS.yellow : channel.mute ? COLORS.red : COLORS.amberDark;
  canvas.lineWidth = 2 * scale;
  canvas.strokeRect(scaledX, scaledY, scaledW, scaledH);

  // Draw channel number
  canvas.fillStyle = COLORS.textPrimary;
  canvas.font = `bold ${12 * scale}px 'Bebas Neue', sans-serif`;
  canvas.textAlign = 'center';
  canvas.fillText(`CH ${channel.number}`, scaledX + scaledW / 2, scaledY + 16 * scale);

  // Draw fader
  const faderX = scaledX + scaledW / 2 - 8 * scale;
  const faderY = scaledY + 30 * scale;
  const faderW = 16 * scale;
  const faderH = scaledH - 60 * scale;

  drawFader({ ctx: canvas, width: scaledW, height: scaledH, scale: 1, offsetX: 0, offsetY: 0 }, 
    faderX / scale, faderY / scale, faderW / scale, faderH / scale, 1 - channel.gain);

  // Draw level meter
  const meterX = scaledX + scaledW / 2;
  const meterY = scaledY + scaledH - 20 * scale;
  const meterW = scaledW - 8 * scale;
  const meterH = 8 * scale;

  canvas.fillStyle = COLORS.panelBg;
  canvas.fillRect(meterX - meterW / 2, meterY, meterW, meterH);

  // Draw level indicator
  const levelColor = channel.level > 0.9 ? COLORS.red : channel.level > 0.7 ? COLORS.yellow : COLORS.green;
  canvas.fillStyle = levelColor;
  canvas.fillRect(meterX - meterW / 2, meterY, meterW * channel.level, meterH);

  // Draw mute/solo buttons
  const buttonY = scaledY + scaledH - 12 * scale;
  const muteX = scaledX + 4 * scale;
  const soloX = scaledX + scaledW - 16 * scale;

  canvas.fillStyle = channel.mute ? COLORS.red : COLORS.textDim;
  canvas.fillRect(muteX, buttonY, 12 * scale, 10 * scale);
  canvas.fillStyle = COLORS.textPrimary;
  canvas.font = `${6 * scale}px 'Consolas', monospace`;
  canvas.textAlign = 'center';
  canvas.fillText('M', muteX + 6 * scale, buttonY + 7 * scale);

  canvas.fillStyle = channel.solo ? COLORS.yellow : COLORS.textDim;
  canvas.fillRect(soloX, buttonY, 12 * scale, 10 * scale);
  canvas.fillStyle = COLORS.textPrimary;
  canvas.fillText('S', soloX + 6 * scale, buttonY + 7 * scale);
}
