import React, { useMemo, useState } from 'react';
import type { EquipmentNode, Connection } from '../../../../shared/equipment-types';
import type { PatchbayStrip } from '@/lib/patchbay-logic';
import { usePatchbayRegistry } from '@/lib/patchbay-logic';

interface Props {
  nodes: EquipmentNode[];
  connections: Connection[];
  onSelectCable: (id: string | null) => void;
  selectedCableId: string | null;
  onFocusConnection?: (connection: Connection) => void;
  onConnect?: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => void;
  registry?: ReturnType<typeof usePatchbayRegistry>;
  embedded?: boolean;
}

export const PatchbayPanel: React.FC<Props> = ({
  nodes,
  connections,
  onSelectCable,
  selectedCableId,
  onFocusConnection,
  onConnect,
  registry,
  embedded = false,
}) => {
  const fallbackRegistry = usePatchbayRegistry({ nodes, connections, selectedNodeId: null });
  const activeRegistry = registry ?? fallbackRegistry;
  const [pendingSocket, setPendingSocket] = useState<{
    nodeId: string;
    portId: string;
    direction: 'out' | 'in';
    label: string;
  } | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const byPair = useMemo(() => {
    const m = new Map<string, Connection>();
    connections.forEach((c) => {
      m.set(`${c.fromNodeId}:${c.fromPortId}->${c.toNodeId}:${c.toPortId}`, c);
    });
    return m;
  }, [connections]);

  const selectAndFocus = (c?: Connection) => {
    if (!c) return;
    onSelectCable(selectedCableId === c.id ? null : c.id);
    onFocusConnection?.(c);
  };

  const handleSocketClick = (
    socket: {
      nodeId: string;
      portId: string;
      direction: 'out' | 'in';
      label: string;
    }
  ) => {
    if (!pendingSocket) {
      setPendingSocket(socket);
      return;
    }
    if (pendingSocket.direction === socket.direction) {
      setPendingSocket(socket);
      return;
    }
    const out = pendingSocket.direction === 'out' ? pendingSocket : socket;
    const input = pendingSocket.direction === 'in' ? pendingSocket : socket;
    onConnect?.(out.nodeId, out.portId, input.nodeId, input.portId);
    const conn = byPair.get(`${out.nodeId}:${out.portId}->${input.nodeId}:${input.portId}`);
    selectAndFocus(conn);
    setPendingSocket(null);
  };

  const renderStrip = (strip: PatchbayStrip) => (
    <div key={strip.id} className="rounded-md border border-white/10 bg-black/35 p-2">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/80">
        {strip.label}
      </div>
      <div className="mb-0.5 grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {Array.from({ length: 24 }, (_, i) => {
          const col = i + 1;
          const heading = strip.headings?.find((h) => col >= h.start && col <= h.end);
          const isHeadingStart = heading ? heading.start === col : false;
          return (
            <div key={`${strip.id}:h:${col}`} className="h-3 text-center text-[7px] text-zinc-500">
              {isHeadingStart && heading ? (
                <span
                  className="inline-block rounded bg-white/8 px-1 text-[7px] font-semibold text-zinc-300"
                  style={{ width: `calc((100% * ${heading.end - heading.start + 1}) + ${heading.end - heading.start}px)` }}
                >
                  {heading.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {Array.from({ length: 24 }, (_, i) => {
          const col = i + 1;
          const sock = strip.sockets.find((s) => s.channelNumber === col);
          return (
            <div key={`${strip.id}:${col}`} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                title={sock?.label ?? 'Open'}
                onMouseEnter={() => setHoverLabel(sock?.label ?? null)}
                onMouseLeave={() => setHoverLabel(null)}
                onClick={() =>
                  sock &&
                  handleSocketClick({
                    nodeId: sock.nodeId,
                    portId: sock.portId,
                    direction: sock.direction,
                    label: sock.label,
                  })
                }
                className={`h-4 w-4 rounded-full border text-[7px] ${
                  sock
                    ? sock.direction === 'out'
                      ? 'border-amber-300/60 bg-amber-200/20 hover:bg-amber-200/35'
                      : 'border-sky-300/60 bg-sky-200/20 hover:bg-sky-200/35'
                    : 'cursor-default border-white/10 bg-zinc-900/70'
                } ${
                  sock &&
                  pendingSocket &&
                  pendingSocket.nodeId === sock.nodeId &&
                  pendingSocket.portId === sock.portId
                    ? 'ring-2 ring-emerald-400/70'
                    : ''
                }`}
              />
              <span className="text-[7px] text-zinc-500">{col}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const body = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/90">
        Patchbay · TT Matrix
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-2">{activeRegistry.strips.map(renderStrip)}</div>
      </div>
      <div className="shrink-0 border-t border-white/10 px-3 py-1.5 text-[10px] text-zinc-400">
        {pendingSocket
          ? `Pending: ${pendingSocket.label} (${pendingSocket.direction.toUpperCase()})`
          : hoverLabel ?? 'Hover a socket to inspect its label'}
      </div>
    </div>
  );

  return <div className={`h-full ${embedded ? 'bg-[#141414]/90' : 'bg-[#151515]/85'}`}>{body}</div>;
};
