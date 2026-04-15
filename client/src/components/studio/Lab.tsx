import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Renderer from './Renderer';
import ProfessionalMixerConsole from '../ProfessionalMixerConsole';
import EquipmentLibraryPanel from '../EquipmentLibraryPanel';
import InspectorPanel from '../InspectorPanel';
import ScenarioPanel from '../ScenarioPanel';
import AssistantPanel from '../AssistantPanel';
import MonitorMixPanel from '../MonitorMixPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PeakMeter, VUMeter } from '@/components/Meters';
import { snapRackNodePosition } from '@/lib/canvas-equipment-graphics';
import type { StudioState, EquipmentNode } from '../../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';
import { equipmentLibrary } from '@/lib/equipment-library';
import { audioEngine } from '@/lib/audio-engine-v2';
import { scenarios } from '@/lib/scenarios';

type DeskId = 'ssl-4000g' | 'pearl-asp' | 'vortex-1604';

/** Inspector / safety panels expect `settings` + `signalLevels`; shared nodes use `state` only. */
function adaptNodeForLegacyPanels(node: EquipmentNode): EquipmentNode & {
  settings: Record<string, unknown>;
  signalLevels: Record<string, number>;
} {
  return {
    ...node,
    settings: (node.state ?? {}) as Record<string, unknown>,
    signalLevels: {},
  };
}

const Lab: React.FC = () => {
  const [state, setState] = useState<StudioState>({
    nodes: [],
    connections: [],
    selectedNodeId: null,
  });
  const [deskConsoleId, setDeskConsoleId] = useState<DeskId | null>(null);
  const [zoom, setZoom] = useState(1);
  const [engineRunning, setEngineRunning] = useState(false);
  const [meterDb, setMeterDb] = useState(-100);

  const activeScenario = scenarios[0]!;
  const [completedObjectives, setCompletedObjectives] = useState<Set<string>>(new Set());
  const [scenarioHintId, setScenarioHintId] = useState<string | null>(null);

  const deskNode = useMemo((): EquipmentNode | null => {
    if (!deskConsoleId) return null;
    return {
      id: '__desk_overlay__',
      defId: deskConsoleId,
      x: 0,
      y: 0,
      rotation: 0,
      state: {},
    };
  }, [deskConsoleId]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((s) => {
      setEngineRunning(s.isRunning && s.ctxState === 'running');
    });
    return unsub;
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const peak = audioEngine.getPeakLevel();
      const db =
        peak <= 0 ? -100 : Math.max(-60, Math.min(24, 20 * Math.log10(peak)));
      setMeterDb(db);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const addGear = async (defId: string) => {
    const def = equipmentLibrary.find((d) => d.id === defId);
    if (!def) return;
    if (def.category === 'console') return;

    await audioEngine.start();
    setEngineRunning(audioEngine.isRunning);

    const nodeId = `node-${Date.now()}`;
    const newNode: EquipmentNode = {
      id: nodeId,
      defId,
      x: 400 + Math.random() * 50,
      y: 120 + Math.random() * 40,
      rotation: 0,
      state: {},
    };

    if (def.category === 'signal-gen') {
      audioEngine.createSourceNode(nodeId, 'sine');
    } else if (def.category === 'microphone') {
      audioEngine.createSourceNode(nodeId, 'noise');
    } else {
      audioEngine.ensurePatchNode(nodeId);
    }
    audioEngine.registerNodeProfile(nodeId, defId, newNode.state);

    setState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      selectedNodeId: newNode.id,
    }));
  };

  const handleUpdateNode = useCallback((id: string, x: number, y: number) => {
    setState((ws) => {
      const node = ws.nodes.find((n) => n.id === id);
      if (!node) return ws;
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      const snappedPos =
        def && def.heightUnits > 0
          ? snapRackNodePosition(x, y, def.width, def.heightUnits)
          : { x, y };
      return {
        ...ws,
        nodes: ws.nodes.map((n) =>
          n.id === id ? { ...n, ...snappedPos } : n
        ),
      };
    });
  }, []);

  const handleCanvasControl = useCallback(
    (nodeId: string, controlId: string, value: number | boolean) => {
      setState((prev) => {
        const node = prev.nodes.find((nn) => nn.id === nodeId);
        const def = node
          ? equipmentLibrary.find((d) => d.id === node.defId)
          : undefined;
        if (def && typeof value === 'number') {
          const ctrl = def.controls.find((c) => c.id === controlId);
          if (
            ctrl?.type === 'knob' &&
            ctrl.min != null &&
            ctrl.max != null
          ) {
            const norm =
              (value - ctrl.min) / (ctrl.max - ctrl.min);
            const safe = Math.max(0, Math.min(1, norm));
            if (controlId === 'gain' || controlId === 'input') {
              audioEngine.setNodeGain(nodeId, safe);
            }
            if (
              controlId === 'mid-freq' ||
              controlId === 'low-freq' ||
              controlId === 'high-freq'
            ) {
              audioEngine.setFrequency(nodeId, 80 + safe * 8000);
            }
          }
        }
        return {
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, state: { ...n.state, [controlId]: value } }
              : n
          ),
        };
      });
      audioEngine.updateNodeState(nodeId, controlId, value);
    },
    []
  );

  const handleConnect = useCallback(
    (
      fromNodeId: string,
      fromPortId: string,
      toNodeId: string,
      toPortId: string
    ) => {
      if (fromNodeId === toNodeId) return;
      void audioEngine.start();
      setEngineRunning(audioEngine.isRunning);

      let patch = false;
      setState((prev) => {
        const dup = prev.connections.some(
          (c) =>
            c.fromNodeId === fromNodeId &&
            c.fromPortId === fromPortId &&
            c.toNodeId === toNodeId &&
            c.toPortId === toPortId
        );
        if (dup) return prev;

        const fromNode = prev.nodes.find((n) => n.id === fromNodeId);
        const fromDef = fromNode
          ? equipmentLibrary.find((d) => d.id === fromNode.defId)
          : undefined;
        const fromPort = fromDef?.outputs.find((p) => p.id === fromPortId);
        const cableColor =
          fromPort?.type === 'mic'
            ? 'mic'
            : fromPort?.type === 'speaker'
              ? 'speaker'
              : fromPort?.type === 'digital'
                ? 'digital'
                : 'line';

        patch = true;
        return {
          ...prev,
          connections: [
            ...prev.connections,
            {
              id: `conn-${Date.now()}`,
              fromNodeId,
              fromPortId,
              toNodeId,
              toPortId,
              cableColor,
            },
          ],
        };
      });

      if (patch) {
        audioEngine.ensurePatchNode(fromNodeId);
        audioEngine.ensurePatchNode(toNodeId);
        audioEngine.connectNodes(fromNodeId, toNodeId);
      }
    },
    []
  );

  const chooseSessionDesk = useCallback(async (defId: DeskId) => {
    await audioEngine.start();
    setEngineRunning(audioEngine.isRunning);
    setDeskConsoleId(defId);
  }, []);

  const handlePlay = async () => {
    await audioEngine.start();
    audioEngine.setMasterGain(0.5);
    setEngineRunning(audioEngine.isRunning);
  };

  const handleStop = async () => {
    await audioEngine.suspendOutputWithRampDown();
    setEngineRunning(false);
  };

  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);
  const selectedDef = selectedNode
    ? equipmentLibrary.find((e) => e.id === selectedNode.defId)
    : undefined;

  const inspectorNode = useMemo(
    () => (selectedNode ? adaptNodeForLegacyPanels(selectedNode) : null),
    [selectedNode]
  );

  const allNodesAdapted = useMemo(
    () => state.nodes.map(adaptNodeForLegacyPanels),
    [state.nodes]
  );

  const onUpdateSetting = useCallback((key: string, value: number | boolean | string) => {
    if (!state.selectedNodeId) return;
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === state.selectedNodeId
          ? { ...n, state: { ...n.state, [key]: value } }
          : n
      ),
    }));
    audioEngine.updateNodeState(state.selectedNodeId, key, value);
  }, [state.selectedNodeId]);

  const onRemoveNode = useCallback(() => {
    if (!state.selectedNodeId) return;
    const id = state.selectedNodeId;
    audioEngine.disconnectNode(id);
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== id),
      connections: prev.connections.filter(
        (c) => c.fromNodeId !== id && c.toNodeId !== id
      ),
      selectedNodeId: null,
    }));
  }, [state.selectedNodeId]);

  const onToggleScenarioHint = useCallback((objectiveId: string) => {
    setScenarioHintId((prev) => (prev === objectiveId ? null : objectiveId));
  }, []);

  return (
    <div className="flex h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden bg-[#0a0a0a] text-sm text-white">
      <div className="h-full flex min-h-0 flex-1 overflow-hidden bg-[#0a0a0a]">
        {/* Left — Equipment library */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 font-medium">
          <EquipmentLibraryPanel onAddEquipment={addGear} />
        </aside>

        {/* Center — Canvas + desk overlay (console is never a workspace node) */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <Renderer
            state={state}
            deskNode={deskNode}
            zoom={zoom}
            onSelectNode={(id) =>
              setState((prev) => ({ ...prev, selectedNodeId: id }))
            }
            onUpdateNode={handleUpdateNode}
            onControlChange={handleCanvasControl}
            onConnect={handleConnect}
          />

          <Dialog open={deskConsoleId === null}>
            <DialogContent
              className="border border-[#333] bg-[#141414] text-[#F5F0E8] sm:max-w-md"
              onPointerDownOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle
                  className="font-bold tracking-wider text-[#E8A020]"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  Session setup
                </DialogTitle>
                <DialogDescription className="text-[#A89F94] text-sm font-medium">
                  Choose a console for this session. It appears as the desk at the bottom only — not on the patch canvas.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => chooseSessionDesk('ssl-4000g')}
                  className="rounded border border-[#333] bg-[#1a1a1a] px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[#E8A020]/50 hover:bg-[#222]"
                >
                  <span className="text-[#E8A020]">SSL</span> 4000 G+
                  <span className="mt-0.5 block text-xs text-[#777]">
                    Large-format rock/pop desk
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => chooseSessionDesk('pearl-asp')}
                  className="rounded border border-[#333] bg-[#1a1a1a] px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[#E8A020]/50 hover:bg-[#222]"
                >
                  <span className="text-[#E8A020]">Audient</span> Pearl ASP
                  <span className="mt-0.5 block text-xs text-[#777]">
                    Heritage recording console
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => chooseSessionDesk('vortex-1604')}
                  className="rounded border border-[#333] bg-[#1a1a1a] px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[#E8A020]/50 hover:bg-[#222]"
                >
                  <span className="text-[#E8A020]">Vortex</span> 1604
                  <span className="mt-0.5 block text-xs text-[#777]">
                    Compact 16-channel utility mixer
                  </span>
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {deskNode && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-1/2 min-h-[200px]">
              <div className="pointer-events-auto h-full">
                <ProfessionalMixerConsole node={deskNode} />
              </div>
            </div>
          )}

          <div className="absolute right-4 top-4 z-20 flex gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="h-8 w-8 rounded border border-white/10 bg-black/60"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="h-8 w-8 rounded border border-white/10 bg-black/60"
            >
              +
            </button>
          </div>
        </div>

        {/* Right — Tabbed tools */}
        <div className="flex h-full w-96 min-w-[384px] flex-col overflow-hidden border-l border-white/10 bg-[#0d0d0d] font-medium">
          <Tabs defaultValue="inspector" className="flex h-full min-h-0 min-w-0 flex-col">
            <TabsList className="h-auto shrink-0 flex-wrap justify-start gap-0.5 bg-[#1a1a1a] p-1">
              <TabsTrigger
                value="inspector"
                className="text-xs font-medium data-[state=active]:bg-[#E8A020] data-[state=active]:text-[#0D0D0D]"
              >
                Inspector
              </TabsTrigger>
              <TabsTrigger
                value="scenario"
                className="text-xs font-medium data-[state=active]:bg-[#E8A020] data-[state=active]:text-[#0D0D0D]"
              >
                Scenario
              </TabsTrigger>
              <TabsTrigger
                value="assistant"
                className="text-xs font-medium data-[state=active]:bg-[#E8A020] data-[state=active]:text-[#0D0D0D]"
              >
                Assistant
              </TabsTrigger>
              <TabsTrigger
                value="monitors"
                className="text-xs font-medium data-[state=active]:bg-[#E8A020] data-[state=active]:text-[#0D0D0D]"
              >
                Monitors
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="inspector"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              {inspectorNode && selectedDef ? (
                <InspectorPanel
                  node={inspectorNode as EquipmentNode}
                  def={selectedDef as EquipmentDef}
                  onUpdateSetting={onUpdateSetting}
                  onRemove={onRemoveNode}
                  allNodes={allNodesAdapted as EquipmentNode[]}
                  allCables={state.connections as unknown[]}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-[11px] text-[#555]">
                  Select a piece of equipment on the canvas to edit its parameters.
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="scenario"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <ScenarioPanel
                scenario={activeScenario}
                completedObjectives={completedObjectives}
                showHint={scenarioHintId}
                onToggleHint={onToggleScenarioHint}
                onClose={() => setScenarioHintId(null)}
              />
            </TabsContent>

            <TabsContent
              value="assistant"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <AssistantPanel
                nodes={allNodesAdapted as EquipmentNode[]}
                cables={state.connections as never[]}
              />
            </TabsContent>

            <TabsContent
              value="monitors"
              className="mt-0 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <MonitorMixPanel mixes={[]} channelNames={[]} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-6 border-t border-white/10 bg-[#141414] px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlay}
            className="rounded bg-emerald-700 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-600"
          >
            Play
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="rounded bg-red-900/80 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-800"
          >
            Stop
          </button>
          <span className="font-mono text-[9px] text-[#666]">
            {engineRunning ? 'RUNNING' : 'SUSPENDED'}
          </span>
        </div>
        <div className="flex flex-1 items-end justify-end gap-6">
          <VUMeter level={meterDb} label="MASTER" />
          <PeakMeter level={meterDb} label="PEAK" />
        </div>
      </footer>
    </div>
  );
};

export default Lab;
