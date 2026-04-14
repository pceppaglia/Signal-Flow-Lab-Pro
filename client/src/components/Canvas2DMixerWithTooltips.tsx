import React, { useRef, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Channel {
  number: number;
  gain: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  level: number;
  auxSends: number[];
  name: string;
}

interface Canvas2DMixerWithTooltipsProps {
  channels: Channel[];
  masterGain: number;
  masterLevel: number;
  auxReturns: number[];
}

export default function Canvas2DMixerWithTooltips({
  channels,
  masterGain,
  masterLevel,
  auxReturns,
}: Canvas2DMixerWithTooltipsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Draw mixer background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw channel strips
    const channelWidth = 60;
    const startX = 20;
    const startY = 40;

    channels.forEach((ch, idx) => {
      const x = startX + idx * (channelWidth + 10);
      const y = startY;

      // Channel background
      ctx.fillStyle = '#222';
      ctx.fillRect(x, y, channelWidth, 200);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, channelWidth, 200);

      // Channel name
      ctx.fillStyle = '#E8A020';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(ch.name, x + channelWidth / 2, y + 15);

      // Fader background
      const faderX = x + channelWidth / 2 - 3;
      const faderY = y + 30;
      const faderHeight = 120;
      ctx.fillStyle = '#111';
      ctx.fillRect(faderX - 3, faderY, 6, faderHeight);

      // Fader position
      const faderPos = faderY + faderHeight * (1 - ch.gain);
      ctx.fillStyle = '#E8A020';
      ctx.fillRect(faderX - 5, faderPos, 10, 8);

      // Level meter
      const meterX = x + 8;
      const meterY = y + 160;
      const meterHeight = 30;
      ctx.fillStyle = '#111';
      ctx.fillRect(meterX, meterY, 8, meterHeight);

      // Meter level
      const levelHeight = meterHeight * ch.level;
      ctx.fillStyle = ch.level > 0.8 ? '#C0392B' : '#4CAF50';
      ctx.fillRect(meterX, meterY + meterHeight - levelHeight, 8, levelHeight);

      // Mute button
      ctx.fillStyle = ch.mute ? '#C0392B' : '#333';
      ctx.fillRect(x + 5, y + 165, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '8px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('M', x + 11, y + 173);

      // Solo button
      ctx.fillStyle = ch.solo ? '#4CAF50' : '#333';
      ctx.fillRect(x + 20, y + 165, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText('S', x + 26, y + 173);

      // Pan indicator
      const panX = x + 8 + (ch.pan + 1) * 20;
      ctx.fillStyle = '#E8A020';
      ctx.beginPath();
      ctx.arc(panX, y + 185, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw master section
    const masterX = startX + channels.length * (channelWidth + 10) + 20;
    const masterY = startY;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(masterX, masterY, 80, 200);
    ctx.strokeStyle = '#E8A020';
    ctx.lineWidth = 2;
    ctx.strokeRect(masterX, masterY, 80, 200);

    ctx.fillStyle = '#E8A020';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('MASTER', masterX + 40, masterY + 20);

    // Master fader
    const masterFaderX = masterX + 40 - 3;
    const masterFaderY = masterY + 35;
    const masterFaderHeight = 120;
    ctx.fillStyle = '#111';
    ctx.fillRect(masterFaderX - 3, masterFaderY, 6, masterFaderHeight);

    const masterFaderPos = masterFaderY + masterFaderHeight * (1 - masterGain);
    ctx.fillStyle = '#E8A020';
    ctx.fillRect(masterFaderX - 5, masterFaderPos, 10, 8);

    // Master level meter
    const masterMeterX = masterX + 15;
    const masterMeterY = masterY + 160;
    const masterMeterHeight = 30;
    ctx.fillStyle = '#111';
    ctx.fillRect(masterMeterX, masterMeterY, 8, masterMeterHeight);

    const masterLevelHeight = masterMeterHeight * masterLevel;
    ctx.fillStyle = masterLevel > 0.8 ? '#C0392B' : '#4CAF50';
    ctx.fillRect(masterMeterX, masterMeterY + masterMeterHeight - masterLevelHeight, 8, masterLevelHeight);

    // Aux returns section
    const auxX = masterX + 100;
    const auxY = startY;

    ctx.fillStyle = '#222';
    ctx.fillRect(auxX, auxY, 70, 200);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(auxX, auxY, 70, 200);

    ctx.fillStyle = '#E8A020';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('AUX RETURNS', auxX + 35, auxY + 15);

    auxReturns.forEach((level, idx) => {
      const auxItemY = auxY + 35 + idx * 50;
      ctx.fillStyle = '#111';
      ctx.fillRect(auxX + 10, auxItemY, 8, 40);

      const auxLevelHeight = 40 * level;
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(auxX + 10, auxItemY + 40 - auxLevelHeight, 8, auxLevelHeight);

      ctx.fillStyle = '#A89F94';
      ctx.font = '8px Inter';
      ctx.fillText(`Aux ${idx + 1}`, auxX + 35, auxItemY + 50);
    });
  }, [channels, masterGain, masterLevel, auxReturns]);

  return (
    <div className="h-full flex flex-col bg-[#111] border-l border-[#222] p-3 space-y-3 overflow-y-auto">
      <div className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
        MIXING CONSOLE
      </div>

      <TooltipProvider>
        <div className="space-y-2 text-[9px] text-[#A89F94]">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">📊 Faders</div>
              </TooltipTrigger>
              <TooltipContent>Adjust channel and master output levels. Drag up to increase gain.</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">🔊 Pan</div>
              </TooltipTrigger>
              <TooltipContent>Position signal in stereo field. Center is mono, left/right for panning.</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">🔇 Mute/Solo</div>
              </TooltipTrigger>
              <TooltipContent>M = Mute channel. S = Solo (listen to only this channel).</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">📤 Aux Sends</div>
              </TooltipTrigger>
              <TooltipContent>Route channel signal to auxiliary buses for effects or monitor mixes.</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">🔌 Direct Out</div>
              </TooltipTrigger>
              <TooltipContent>Send channel directly to external gear, bypassing master fader.</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">🔗 Insert</div>
              </TooltipTrigger>
              <TooltipContent>Insert effects/processors into channel signal path for EQ, compression, etc.</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      <canvas
        ref={canvasRef}
        className="w-full h-48 bg-[#0D0D0D] rounded border border-[#222]"
      />
    </div>
  );
}
