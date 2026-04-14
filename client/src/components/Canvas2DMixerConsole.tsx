import React, { useEffect, useRef, useState } from 'react';

interface Channel {
  id: string;
  name: string;
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  faderLevel: number;
  auxSends: number[];
  directOut: boolean;
  insertEnabled: boolean;
}

interface Canvas2DMixerConsoleProps {
  channels: Channel[];
  masterGain: number;
  auxReturns: number[];
  onChannelGainChange: (channelId: string, gain: number) => void;
  onChannelPanChange: (channelId: string, pan: number) => void;
  onChannelMuteToggle: (channelId: string) => void;
  onChannelSoloToggle: (channelId: string) => void;
  onMasterGainChange: (gain: number) => void;
  onAuxSendChange: (channelId: string, auxIndex: number, level: number) => void;
}

export default function Canvas2DMixerConsole({
  channels,
  masterGain,
  auxReturns,
  onChannelGainChange,
  onChannelPanChange,
  onChannelMuteToggle,
  onChannelSoloToggle,
  onMasterGainChange,
  onAuxSendChange,
}: Canvas2DMixerConsoleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingFader, setDraggingFader] = useState<{ channelId: string; type: 'fader' | 'pan' | 'aux'; auxIndex?: number } | null>(null);

  const CHANNEL_WIDTH = 80;
  const CHANNEL_SPACING = 10;
  const FADER_HEIGHT = 200;
  const FADER_WIDTH = 20;
  const KNOB_RADIUS = 15;

  // Draw photorealistic fader
  const drawFader = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, value: number, label: string) => {
    // Fader background (dark groove)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - width / 2, y, width, height);

    // Fader border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width / 2, y, width, height);

    // Fader slider position
    const sliderY = y + (1 - value) * height;

    // Slider shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - width / 2 + 2, sliderY + 2, width - 4, 12);

    // Slider gradient (metallic look)
    const sliderGradient = ctx.createLinearGradient(x - width / 2, sliderY, x + width / 2, sliderY);
    sliderGradient.addColorStop(0, '#d4af37');
    sliderGradient.addColorStop(0.5, '#f0e68c');
    sliderGradient.addColorStop(1, '#d4af37');
    ctx.fillStyle = sliderGradient;
    ctx.fillRect(x - width / 2, sliderY, width, 12);

    // Slider border
    ctx.strokeStyle = '#8b7500';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - width / 2, sliderY, width, 12);

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + height + 15);

    // Value display
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(Math.round(value * 100) + '%', x, y + height + 28);
  };

  // Draw photorealistic knob
  const drawKnob = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, value: number, label: string) => {
    // Knob background circle
    const knobGradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, 0, x, y, radius);
    knobGradient.addColorStop(0, '#555');
    knobGradient.addColorStop(0.5, '#222');
    knobGradient.addColorStop(1, '#111');
    ctx.fillStyle = knobGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Knob border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Knob indicator line
    const angle = (value * 270 - 135) * (Math.PI / 180);
    const indicatorX = x + Math.cos(angle) * (radius - 5);
    const indicatorY = y + Math.sin(angle) * (radius - 5);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(indicatorX, indicatorY);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + radius + 18);

    // Value display
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(Math.round(value * 100) + '%', x, y + radius + 30);
  };

  // Draw button
  const drawButton = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, active: boolean) => {
    // Button background
    ctx.fillStyle = active ? '#d4af37' : '#333';
    ctx.fillRect(x, y, width, height);

    // Button border
    ctx.strokeStyle = active ? '#8b7500' : '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Button text
    ctx.fillStyle = active ? '#000' : '#aaa';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2);
  };

  // Draw VU meter
  const drawMeter = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, level: number) => {
    // Meter background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, width, height);

    // Meter border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Meter level bar
    const barWidth = width * Math.max(0, Math.min(1, level));
    const barGradient = ctx.createLinearGradient(x, y, x + width, y);
    barGradient.addColorStop(0, '#00ff00');
    barGradient.addColorStop(0.7, '#ffff00');
    barGradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = barGradient;
    ctx.fillRect(x, y, barWidth, height);

    // Meter scale lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const lineX = x + (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX, y + 3);
      ctx.stroke();
    }
  };

  // Draw channel strip
  const drawChannelStrip = (ctx: CanvasRenderingContext2D, channel: Channel, x: number, y: number) => {
    // Channel background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, CHANNEL_WIDTH, 350);

    // Channel border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, CHANNEL_WIDTH, 350);

    // Channel name
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(channel.name, x + CHANNEL_WIDTH / 2, y + 15);

    // VU Meter
    drawMeter(ctx, x + 5, y + 25, CHANNEL_WIDTH - 10, 30, channel.faderLevel);

    // Fader
    drawFader(ctx, x + CHANNEL_WIDTH / 2, y + 70, FADER_WIDTH, FADER_HEIGHT, channel.faderLevel, 'Level');

    // Pan knob
    drawKnob(ctx, x + CHANNEL_WIDTH / 2, y + 290, KNOB_RADIUS, (channel.pan + 1) / 2, 'Pan');

    // Mute button
    drawButton(ctx, x + 5, y + 320, (CHANNEL_WIDTH - 10) / 2 - 2, 20, 'M', channel.muted);

    // Solo button
    drawButton(ctx, x + CHANNEL_WIDTH / 2 + 2, y + 320, (CHANNEL_WIDTH - 10) / 2 - 2, 20, 'S', channel.solo);
  };

  // Draw master section
  const drawMasterSection = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Master background
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(x, y, CHANNEL_WIDTH + 20, 350);

    // Master border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, CHANNEL_WIDTH + 20, 350);

    // Master label
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MASTER', x + (CHANNEL_WIDTH + 20) / 2, y + 15);

    // Master fader
    drawFader(ctx, x + (CHANNEL_WIDTH + 20) / 2, y + 40, FADER_WIDTH, FADER_HEIGHT, masterGain, 'L/R');
  };

  // Handle canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw channel strips
    let xPos = 20;
    channels.forEach((channel) => {
      drawChannelStrip(ctx, channel, xPos, 20);
      xPos += CHANNEL_WIDTH + CHANNEL_SPACING;
    });

    // Draw master section
    drawMasterSection(ctx, xPos + 20, 20);

    // Draw aux returns section
    const auxX = xPos + CHANNEL_WIDTH + 60;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(auxX, 20, CHANNEL_WIDTH + 20, 350);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(auxX, 20, CHANNEL_WIDTH + 20, 350);

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AUX RETURNS', auxX + (CHANNEL_WIDTH + 20) / 2, 40);

    // Draw aux return faders
    auxReturns.forEach((level, index) => {
      drawFader(ctx, auxX + (CHANNEL_WIDTH + 20) / 2, 70 + index * 80, FADER_WIDTH, 60, level, `Aux ${index + 1}`);
    });
  }, [channels, masterGain, auxReturns]);

  // Handle mouse interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a fader or knob
    let xPos = 20;
    channels.forEach((channel) => {
      // Check fader
      if (x > xPos + CHANNEL_WIDTH / 2 - FADER_WIDTH / 2 && x < xPos + CHANNEL_WIDTH / 2 + FADER_WIDTH / 2 && y > 70 && y < 70 + FADER_HEIGHT) {
        setDraggingFader({ channelId: channel.id, type: 'fader' });
      }
      xPos += CHANNEL_WIDTH + CHANNEL_SPACING;
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingFader) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;

    if (draggingFader.type === 'fader') {
      const newValue = Math.max(0, Math.min(1, 1 - (y - 70) / FADER_HEIGHT));
      onChannelGainChange(draggingFader.channelId, newValue);
    }
  };

  const handleMouseUp = () => {
    setDraggingFader(null);
  };

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1200}
        height={400}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
