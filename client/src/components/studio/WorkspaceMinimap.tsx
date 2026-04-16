import React, { useCallback, useRef } from 'react';
import type { EquipmentNode } from '../../../../shared/equipment-types';
import { equipmentLibrary } from '@/lib/equipment-library';

export interface WorkspaceMinimapProps {
  worldW: number;
  worldH: number;
  panX: number;
  panY: number;
  viewW: number;
  viewH: number;
  /** Canvas zoom (1 = 100%); viewport rect size tracks this via viewW/viewH. */
  zoom?: number;
  nodes: EquipmentNode[];
  rackLeft: number;
  rackRight: number;
  onPanChange: (x: number, y: number) => void;
}

export const WorkspaceMinimap: React.FC<WorkspaceMinimapProps> = ({
  worldW,
  worldH,
  panX,
  panY,
  viewW,
  viewH,
  zoom = 1,
  nodes,
  rackLeft,
  rackRight,
  onPanChange,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { kind: 'view'; offX: number; offY: number }
    | { kind: 'grab'; startPanX: number; startPanY: number; startWx: number; startWy: number }
    | null
  >(null);

  const mapW = 172;
  const scale = mapW / worldW;
  const mapH = Math.max(52, Math.round(worldH * scale));

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min(Math.max(0, x), Math.max(0, worldW - viewW)),
      y: Math.min(Math.max(0, y), Math.max(0, worldH - viewH)),
    }),
    [worldW, worldH, viewW, viewH]
  );

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const el = rootRef.current;
      if (!el) return { wx: 0, wy: 0 };
      const r = el.getBoundingClientRect();
      return {
        wx: (clientX - r.left) / scale,
        wy: (clientY - r.top) / scale,
      };
    },
    [scale]
  );

  const viewContains = (wx: number, wy: number) =>
    wx >= panX && wx <= panX + viewW && wy >= panY && wy <= panY + viewH;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!rootRef.current) return;
    rootRef.current.setPointerCapture(e.pointerId);
    const { wx, wy } = clientToWorld(e.clientX, e.clientY);
    if (viewContains(wx, wy)) {
      dragRef.current = { kind: 'view', offX: wx - panX, offY: wy - panY };
    } else {
      dragRef.current = {
        kind: 'grab',
        startPanX: panX,
        startPanY: panY,
        startWx: wx,
        startWy: wy,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const { wx, wy } = clientToWorld(e.clientX, e.clientY);
    if (d.kind === 'view') {
      const c = clamp(wx - d.offX, wy - d.offY);
      onPanChange(c.x, c.y);
    } else {
      const dx = d.startWx - wx;
      const dy = d.startWy - wy;
      const c = clamp(d.startPanX + dx, d.startPanY + dy);
      onPanChange(c.x, c.y);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      rootRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const vx = panX * scale;
  const vy = panY * scale;
  const vw = Math.min(mapW, Math.max(6, viewW * scale));
  const vh = Math.min(mapH, Math.max(6, viewH * scale));

  return (
    <div className="pointer-events-auto select-none rounded border border-white/15 bg-black/75 p-1.5 shadow-lg backdrop-blur-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-amber-200/80">
        <span>Bird&apos;s eye</span>
        <span className="tabular-nums text-[8px] font-semibold text-zinc-400">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <div
        ref={rootRef}
        className="relative cursor-grab active:cursor-grabbing"
        style={{ width: mapW, height: mapH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute inset-0 rounded-sm bg-[#0a0a0a]"
          aria-hidden
        />
        <div
          className="absolute top-0 rounded-sm bg-amber-900/25"
          style={{
            left: rackLeft * scale,
            width: Math.max(0, (rackRight - rackLeft) * scale),
            height: '100%',
          }}
          aria-hidden
        />
        {nodes.map((n) => {
          const d = equipmentLibrary.find((x) => x.id === n.defId);
          if (!d) return null;
          const nh = d.heightUnits > 0 ? d.heightUnits * 44 : 100;
          return (
            <div
              key={n.id}
              className="absolute rounded-[1px] bg-white/22"
              style={{
                left: n.x * scale,
                top: n.y * scale,
                width: Math.max(2, d.width * scale),
                height: Math.max(2, nh * scale),
              }}
              aria-hidden
            />
          );
        })}
        <div
          className="absolute rounded-sm border-2 border-amber-400/90 bg-amber-400/12 shadow-[0_0_10px_rgba(251,191,36,0.35)]"
          style={{
            left: vx,
            top: vy,
            width: vw,
            height: vh,
          }}
          aria-label="Viewport"
        />
      </div>
    </div>
  );
};
