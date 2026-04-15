import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Renderer from './Renderer';
import ProfessionalMixerConsole from '../ProfessionalMixerConsole';
import EquipmentLibraryPanel from '../EquipmentLibraryPanel';
import InspectorPanel from '../InspectorPanel';
import ScenarioPanel from '../ScenarioPanel';
import AssistantPanel from '../AssistantPanel';
import MonitorMixPanel from '../MonitorMixPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeakMeter, VUMeter } from '@/components/Meters';
import type { StudioState, EquipmentNode } from '../../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';
import { equipmentLibrary } from '@/lib/equipment-library';
import { audioEngine } from '@/lib/audio-engine-v2';
import { scenarios } from '@/lib/scenarios';

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
  const [zoom, setZoom] = useState(1);
  const [engineRunning, setEngineRunning] = useState(false);
  const [meterDb, setMeterDb] = useState(-100);

  const activeScenario = scenarios[0]!;
  const [completedObjectives, setCompletedObjectives] = useState<Set<string>>(new Set());
  const [scenarioHintId, setScenarioHintId] = useState<string | null>(null);

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
    await audioEngine.start();
    setEngineRunning(audioEngine.isRunning);

    const def = equipmentLibrary.find((d) => d.id === defId);
    if (!def) return;

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
    }

    setState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      selectedNodeId: newNode.id,
    }));
  };

  const handleUpdateNode = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => {
        if (n.id !== id) return n;
        const def = equipmentLibrary.find((d) => d.id === n.defId);

        let finalY = y;
        if (x < 1200 && def && def.heightUnits > 0) {
          finalY = Math.round(y / 44) * 44;
        }

        return { ...n, x, y: finalY };
      }),
    }));
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

        {/* Center — Canvas + optional console */}
        <div className="relative min-h-0 min-w-0 flex-1">
          <Renderer
            state={state}
            zoom={zoom}
            onSelectNode={(id) =>
              setState((prev) => ({ ...prev, selectedNodeId: id }))
            }
            onUpdateNode={handleUpdateNode}
          />

          {selectedNode &&
            equipmentLibrary.find((e) => e.id === selectedNode.defId)
              ?.category === 'console' && (
              <div className="absolute bottom-0 left-0 right-0 h-1/2 min-h-[200px]">
                <ProfessionalMixerConsole node={selectedNode} />
              </div>
            )}

          <div className="absolute right-4 top-4 flex gap-2">
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

        {/* Right — Tabbed tools (fixed width keeps inspector controls in-column) */}
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

      {/* Transport + master meters */}
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
