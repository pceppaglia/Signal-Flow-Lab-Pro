import React, { useRef, useEffect, useCallback } from 'react';
import { audioEngine } from '@/lib/audio-engine';

/** VU Meter with needle animation */
export function VUMeter({ level, label }: { level: number; label?: string }) {
  // Normalize -60..+24 to 0..1
  const normalized = Math.max(0, Math.min(1, (level + 60) / 84));
  const angle = -45 + normalized * 90;
  const isHot = level > 4;
  const isClipping = level > 20;

  return (
    <div className="flex flex-col items-center">
      {label && <div className="text-[9px] text-[#555] tracking-wider mb-1">{label}</div>}
      <svg viewBox="0 0 120 70" className="w-full max-w-[140px]">
        {/* Background */}
        <rect x="0" y="0" width="120" height="70" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />

        {/* Scale markings */}
        {[-40, -20, -10, -7, -5, -3, 0, 1, 2, 3].map((db, i) => {
          const norm = (db + 60) / 84;
          const a = (-45 + norm * 90 - 90) * Math.PI / 180;
          const r1 = 38;
          const r2 = 42;
          const x1 = 60 + r1 * Math.cos(a);
          const y1 = 58 + r1 * Math.sin(a);
          const x2 = 60 + r2 * Math.cos(a);
          const y2 = 58 + r2 * Math.sin(a);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={db >= 0 ? '#C0392B' : '#888'} strokeWidth="0.8" />
              <text x={60 + 46 * Math.cos(a)} y={58 + 46 * Math.sin(a)} textAnchor="middle" fill={db >= 0 ? '#C0392B' : '#888'} fontSize="5">
                {db > 0 ? `+${db}` : db}
              </text>
            </g>
          );
        })}

        {/* VU label */}
        <text x="60" y="40" textAnchor="middle" fill="#E8A020" fontSize="8" fontWeight="bold" fontFamily="'Bebas Neue', Impact, sans-serif">VU</text>

        {/* Needle */}
        <line
          x1="60" y1="58"
          x2={60 + 36 * Math.cos((angle - 90) * Math.PI / 180)}
          y2={58 + 36 * Math.sin((angle - 90) * Math.PI / 180)}
          stroke={isClipping ? '#ff2222' : '#F5F0E8'}
          strokeWidth="1"
          strokeLinecap="round"
          style={{ transition: 'all 0.15s ease-out' }}
        />

        {/* Pivot */}
        <circle cx="60" cy="58" r="3" fill="#333" stroke="#555" strokeWidth="0.5" />
        <circle cx="60" cy="58" r="1.5" fill="#E8A020" />
      </svg>
    </div>
  );
}

/** Peak meter bar */
export function PeakMeter({ level, label }: { level: number; label?: string }) {
  const normalized = Math.max(0, Math.min(1, (level + 60) / 84));
  const segments = 24;

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <div className="text-[9px] text-[#555] tracking-wider">{label}</div>}
      <div className="flex flex-col-reverse gap-[1px]">
        {Array.from({ length: segments }).map((_, i) => {
          const segNorm = (i + 1) / segments;
          const isActive = segNorm <= normalized;
          const isRed = i >= 20;
          const isYellow = i >= 16 && i < 20;
          const color = isRed ? '#C0392B' : isYellow ? '#E8A020' : '#4CAF50';
          return (
            <div
              key={i}
              className="w-6 h-[3px] rounded-[1px]"
              style={{ backgroundColor: isActive ? color : '#1a1a1a' }}
            />
          );
        })}
      </div>
      <div className="text-[9px] font-mono text-[#E8A020]">
        {level > -100 ? `${level.toFixed(0)}` : '—'}
      </div>
    </div>
  );
}

/** Oscilloscope display */
export function Oscilloscope({ width = 280, height = 100 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = audioEngine.getTimeDomainData();

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = (i / 7) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform
    if (data.length > 0) {
      ctx.strokeStyle = '#E8A020';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#E8A020';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      const sliceWidth = width / data.length;
      for (let i = 0; i < data.length; i++) {
        const x = i * sliceWidth;
        const y = (1 - data[i]) * height / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [width, height]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9px] text-[#555] tracking-wider font-bold">OSCILLOSCOPE</div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-[#222]"
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
}

/** Spectrum analyzer */
export function SpectrumAnalyzer({ width = 280, height = 80 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = audioEngine.getFrequencyData();

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    if (data.length > 0) {
      const barCount = 64;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * data.length);
        const value = data[dataIndex] / 255;
        const barHeight = value * height;
        const hue = 30 + value * 10; // Amber range
        ctx.fillStyle = `hsl(${hue}, 80%, ${30 + value * 40}%)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [width, height]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9px] text-[#555] tracking-wider font-bold">SPECTRUM</div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-[#222]"
        style={{ width: '100%', height: `${height}px` }}
      />
    </div>
  );
}
