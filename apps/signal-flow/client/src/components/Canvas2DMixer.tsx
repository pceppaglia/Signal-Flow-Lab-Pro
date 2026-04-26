import React, { useEffect, useRef, useState } from 'react';
import {
  drawChannelStrip,
  drawFader,
  drawVUMeter,
  drawKnob,
  COLORS,
  CanvasRenderContext,
} from '@/lib/canvas-2d-renderer';

interface MixerChannel {
  number: number;
  gain: number; // 0-1
  pan: number; // -1 to 1
  mute: boolean;
  solo: boolean;
  level: number; // 0-1 (for metering)
  auxSends: number[]; // 0-1 for each aux
  name?: string;
}

interface Canvas2DMixerProps {
  channels: MixerChannel[];
  masterGain: number;
  masterLevel: number;
  auxReturns: number[];
  onChannelChange?: (channelIndex: number, changes: Partial<MixerChannel>) => void;
  onMasterChange?: (gain: number) => void;
  onAuxReturnChange?: (auxIndex: number, level: number) => void;
}

export default function Canvas2DMixer({
  channels,
  masterGain,
  masterLevel,
  auxReturns,
  onChannelChange,
  onMasterChange,
  onAuxReturnChange,
}: Canvas2DMixerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'fader' | 'knob' | 'pan';
    channelIndex?: number;
    auxIndex?: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;

    const scale = window.devicePixelRatio;

    // Create render context
    const renderCtx: CanvasRenderContext = {
      ctx,
      width: canvas.width,
      height: canvas.height,
      scale,
      offsetX: 0,
      offsetY: 0,
    };

    // Clear canvas with mixer background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, COLORS.consoleBg);
    gradient.addColorStop(1, COLORS.metalDark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw mixer title bar
    ctx.fillStyle = COLORS.amber;
    ctx.fillRect(0, 0, canvas.width, 30 * scale);

    ctx.fillStyle = COLORS.darkBg;
    ctx.font = `bold ${14 * scale}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('MIXING CONSOLE', 10 * scale, 20 * scale);

    // Draw channel strips
    const channelWidth = 60;
    const startX = 20;
    const startY = 50;

    channels.forEach((channel, index) => {
      const x = startX + index * (channelWidth + 10);
      const y = startY;

      drawChannelStrip(renderCtx, x, y, channelWidth, 200, {
        number: channel.number,
        gain: channel.gain,
        pan: channel.pan,
        mute: channel.mute,
        solo: channel.solo,
        level: channel.level,
        name: channel.name,
      });
    });

    // Draw master section
    const masterX = startX + channels.length * (channelWidth + 10) + 20;
    const masterY = startY;

    // Master background
    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(masterX * scale, masterY * scale, 60 * scale, 200 * scale);

    ctx.strokeStyle = COLORS.amberDark;
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(masterX * scale, masterY * scale, 60 * scale, 200 * scale);

    // Master label
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `bold ${12 * scale}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('MASTER', (masterX + 30) * scale, (masterY + 16) * scale);

    // Master fader
    drawFader(renderCtx, masterX + 22, masterY + 30, 16, 120, 1 - masterGain, 'L/R');

    // Master meter
    drawVUMeter(renderCtx, masterX + 30, masterY + 170, 40, masterLevel, 'dB');

    // Draw aux returns section
    const auxX = masterX + 80;
    const auxY = startY;

    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(auxX * scale, auxY * scale, 80 * scale, 200 * scale);

    ctx.strokeStyle = COLORS.amberDark;
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(auxX * scale, auxY * scale, 80 * scale, 200 * scale);

    // Aux label
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `bold ${12 * scale}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('AUX RETURNS', (auxX + 40) * scale, (auxY + 16) * scale);

    // Draw aux return faders
    auxReturns.forEach((level, index) => {
      const auxFaderX = auxX + 10 + index * 25;
      const auxFaderY = auxY + 30;

      drawFader(renderCtx, auxFaderX, auxFaderY, 12, 120, 1 - level, `AUX ${index + 1}`);
    });
  }, [channels, masterGain, masterLevel, auxReturns]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;

    // Detect which control was clicked (simplified)
    // This would need more sophisticated hit detection in a real implementation
    setDragState({
      type: 'fader',
      startY: y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const dy = y - dragState.startY;

    // Handle fader dragging (simplified)
    // In a real implementation, this would calculate which fader was dragged
    // and update the value accordingly
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden border border-amber-700">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
