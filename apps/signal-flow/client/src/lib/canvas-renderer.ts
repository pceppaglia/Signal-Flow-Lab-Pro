/**
 * Canvas 2D Renderer - Draws realistic equipment graphics
 */

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export function createRenderContext(canvas: HTMLCanvasElement): RenderContext {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  
  return {
    canvas,
    ctx,
    width: rect.width,
    height: rect.height,
    dpr,
  };
}

/**
 * Draw a realistic channel strip
 */
export function drawChannelStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  level: number,
  muted: boolean,
  selected: boolean
) {
  const stripWidth = width;
  const stripHeight = height;
  
  // Background
  ctx.fillStyle = selected ? '#1e293b' : '#0f172a';
  ctx.fillRect(x, y, stripWidth, stripHeight);
  
  // Border
  ctx.strokeStyle = selected ? '#f59e0b' : '#334155';
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeRect(x, y, stripWidth, stripHeight);
  
  // Channel name
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, x + stripWidth / 2, y + 18);
  
  // Input meter
  drawMeter(ctx, x + 6, y + 28, stripWidth - 12, 12, level, muted);
  
  // Fader area
  const faderY = y + 50;
  const faderHeight = stripHeight - 70;
  
  // Fader track
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + 8, faderY, stripWidth - 16, faderHeight);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8, faderY, stripWidth - 16, faderHeight);
  
  // Fader thumb (simplified)
  const thumbY = faderY + (faderHeight * (1 - (level + 60) / 66));
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 6, thumbY - 4, stripWidth - 12, 8);
  
  // Mute button
  const muteY = y + stripHeight - 28;
  ctx.fillStyle = muted ? '#dc2626' : '#334155';
  ctx.fillRect(x + 6, muteY, stripWidth - 12, 12);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, muteY, stripWidth - 12, 12);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('M', x + stripWidth / 2, muteY + 10);
}

/**
 * Draw a meter display
 */
export function drawMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  level: number,
  muted: boolean
) {
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  if (!muted && level > -100) {
    // Normalize level to 0-1
    const normalized = Math.max(0, Math.min(1, (level + 60) / 60));
    
    // Color gradient based on level
    let color = '#22c55e'; // Green
    if (level > -6) color = '#eab308'; // Yellow
    if (level > 0) color = '#ef4444'; // Red
    
    // Fill meter
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, (width - 2) * normalized, height - 2);
  }
}

/**
 * Draw a fader control
 */
export function drawFader(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,
  label: string
) {
  // Track
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Thumb position (0-1 normalized)
  const normalized = (value + 60) / 66; // Assuming -60 to +6 range
  const thumbY = y + height - height * normalized;
  
  // Thumb
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 2, thumbY - 6, width - 4, 12);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, thumbY - 6, width - 4, 12);
  
  // Label
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + width / 2, y - 5);
  
  // Value
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`${value.toFixed(1)}dB`, x + width / 2, y + height + 12);
}

/**
 * Draw a knob control
 */
export function drawKnob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  value: number,
  min: number,
  max: number,
  label: string
) {
  const normalized = (value - min) / (max - min);
  const angle = -Math.PI / 2 + normalized * (Math.PI * 1.5);
  
  // Background circle
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Tick marks
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const tickAngle = -Math.PI / 2 + (i / 10) * (Math.PI * 1.5);
    const x1 = x + Math.cos(tickAngle) * (radius - 4);
    const y1 = y + Math.sin(tickAngle) * (radius - 4);
    const x2 = x + Math.cos(tickAngle) * (radius - 2);
    const y2 = y + Math.sin(tickAngle) * (radius - 2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  // Indicator line
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x + Math.cos(angle) * (radius - 8),
    y + Math.sin(angle) * (radius - 8)
  );
  ctx.stroke();
  
  // Label
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + radius + 16);
  
  // Value
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`${value.toFixed(1)}`, x, y + radius + 28);
}

/**
 * Draw a cable connection
 */
export function drawCable(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  thickness: number = 2,
  selected: boolean = false
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness + (selected ? 1 : 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw cable with slight curve
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const offsetY = Math.abs(x2 - x1) * 0.3;
  
  ctx.bezierCurveTo(
    x1, y1 + offsetY,
    x2, y2 - offsetY,
    x2, y2
  );
  ctx.stroke();
  
  // Draw connection points
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x1, y1, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x2, y2, 4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw an oscilloscope display
 */
export function drawOscilloscope(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Float32Array
) {
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.5;
  const gridSize = width / 8;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * gridSize, y);
    ctx.lineTo(x + i * gridSize, y + height);
    ctx.stroke();
  }
  
  // Center line
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + height / 2);
  ctx.lineTo(x + width, y + height / 2);
  ctx.stroke();
  
  // Waveform
  if (data.length > 0) {
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const xPos = x + (i / data.length) * width;
      const yPos = y + height / 2 - (data[i] * height / 2);
      
      if (i === 0) {
        ctx.moveTo(xPos, yPos);
      } else {
        ctx.lineTo(xPos, yPos);
      }
    }
    ctx.stroke();
  }
}

/**
 * Draw a spectrum analyzer
 */
export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Uint8Array
) {
  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Bars
  const barWidth = width / data.length;
  for (let i = 0; i < data.length; i++) {
    const normalized = data[i] / 255;
    const barHeight = normalized * height;
    
    // Color gradient
    let color = '#22c55e';
    if (normalized > 0.6) color = '#eab308';
    if (normalized > 0.8) color = '#ef4444';
    
    ctx.fillStyle = color;
    ctx.fillRect(
      x + i * barWidth,
      y + height - barHeight,
      barWidth - 1,
      barHeight
    );
  }
}
