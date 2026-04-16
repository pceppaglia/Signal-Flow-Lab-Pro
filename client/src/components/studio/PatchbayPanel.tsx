import React from 'react';
import type { EquipmentNode, Connection } from '../../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';
import { equipmentLibrary } from '@/lib/equipment-library';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface Props {
  nodes: EquipmentNode[];
  connections: Connection[];
  onSelectCable: (id: string | null) => void;
  selectedCableId: string | null;
  onFocusConnection?: (connection: Connection) => void;
}

function portLabel(
  def: EquipmentDef | undefined,
  portId: string,
  side: 'in' | 'out'
): string {
  if (!def) return portId;
  const list = side === 'in' ? def.inputs : def.outputs;
  return list.find((p) => p.id === portId)?.label ?? portId;
}

export const PatchbayPanel: React.FC<Props> = ({
  nodes,
  connections,
  onSelectCable,
  selectedCableId,
  onFocusConnection,
}) => {
  const byOut = new Map<string, Connection[]>();
  const byIn = new Map<string, Connection[]>();
  for (const c of connections) {
    const ok = `${c.fromNodeId}:${c.fromPortId}`;
    const ik = `${c.toNodeId}:${c.toPortId}`;
    if (!byOut.has(ok)) byOut.set(ok, []);
    byOut.get(ok)!.push(c);
    if (!byIn.has(ik)) byIn.set(ik, []);
    byIn.get(ik)!.push(c);
  }

  const selectAndFocus = (c: Connection) => {
    onSelectCable(selectedCableId === c.id ? null : c.id);
    onFocusConnection?.(c);
  };

  return (
    <Collapsible defaultOpen={false} className="border-b border-white/10 bg-[#141414]/90">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-amber-200/90 hover:bg-white/5">
        <span>Patchbay</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-[40vh] overflow-y-auto border-t border-white/5">
        <div className="space-y-3 p-2">
          {nodes.length === 0 ? (
            <p className="px-1 text-[10px] text-zinc-500">No gear on the canvas.</p>
          ) : (
            nodes.map((node) => {
              const def = equipmentLibrary.find((d) => d.id === node.defId);
              if (!def) return null;
              return (
                <div
                  key={node.id}
                  className="rounded border border-white/10 bg-black/30 px-2 py-1.5 text-[10px]"
                >
                  <div className="mb-1 font-bold text-zinc-200">{def.name}</div>
                  <div className="text-[9px] text-zinc-500">{node.id.slice(0, 12)}…</div>
                  {def.inputs.length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[9px] font-semibold uppercase text-sky-300/80">In</div>
                      <ul className="mt-0.5 space-y-0.5">
                        {def.inputs.map((p) => {
                          const ik = `${node.id}:${p.id}`;
                          const links = byIn.get(ik) ?? [];
                          return (
                            <li key={p.id} className="flex flex-wrap items-baseline gap-1 text-zinc-400">
                              <button
                                type="button"
                                className="rounded bg-white/5 px-1 text-zinc-300 hover:bg-white/10"
                                onClick={() => {
                                  const first = links[0];
                                  if (first) selectAndFocus(first);
                                }}
                              >
                                {p.label}
                              </button>
                              {links.length === 0 ? (
                                <span className="text-zinc-600">—</span>
                              ) : (
                                links.map((c) => {
                                  const fromN = nodes.find((n) => n.id === c.fromNodeId);
                                  const fromD = fromN
                                    ? equipmentLibrary.find((e) => e.id === fromN.defId)
                                    : undefined;
                                  return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => selectAndFocus(c)}
                                    className={`rounded px-1 py-0.5 text-left ${
                                      selectedCableId === c.id
                                        ? 'bg-amber-500/30 text-amber-100'
                                        : 'bg-white/10 text-zinc-200 hover:bg-white/15'
                                    }`}
                                  >
                                    ← {portLabel(fromD, c.fromPortId, 'out')} ({fromN?.defId ?? '?'})
                                  </button>
                                );
                                })
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {def.outputs.length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[9px] font-semibold uppercase text-amber-300/80">Out</div>
                      <ul className="mt-0.5 space-y-0.5">
                        {def.outputs.map((p) => {
                          const ok = `${node.id}:${p.id}`;
                          const links = byOut.get(ok) ?? [];
                          return (
                            <li key={p.id} className="flex flex-wrap items-baseline gap-1 text-zinc-400">
                              <button
                                type="button"
                                className="rounded bg-white/5 px-1 text-zinc-300 hover:bg-white/10"
                                onClick={() => {
                                  const first = links[0];
                                  if (first) selectAndFocus(first);
                                }}
                              >
                                {p.label}
                              </button>
                              {links.length === 0 ? (
                                <span className="text-zinc-600">—</span>
                              ) : (
                                links.map((c) => {
                                  const toN = nodes.find((n) => n.id === c.toNodeId);
                                  const toD = toN
                                    ? equipmentLibrary.find((e) => e.id === toN.defId)
                                    : undefined;
                                  return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => selectAndFocus(c)}
                                    className={`rounded px-1 py-0.5 text-left ${
                                      selectedCableId === c.id
                                        ? 'bg-amber-500/30 text-amber-100'
                                        : 'bg-white/10 text-zinc-200 hover:bg-white/15'
                                    }`}
                                  >
                                    → {portLabel(toD, c.toPortId, 'in')} ({toN?.defId ?? '?'})
                                  </button>
                                );
                                })
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
