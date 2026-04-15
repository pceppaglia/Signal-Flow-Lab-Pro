import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Renderer from './Renderer';
import EquipmentLibraryPanel from '../EquipmentLibraryPanel';
import InspectorPanel from '../InspectorPanel';
import ScenarioPanel from '../ScenarioPanel';
import AssistantPanel from '../AssistantPanel';
import MonitorMixPanel from '../MonitorMixPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeakMeter, VUMeter } from '@/components/Meters';
import { snapRackNodePosition } from '@/lib/canvas-equipment-graphics';
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
  const WORKSPACE_STORAGE_KEY = 'signal-flow-workspace';
  const [state, setState] = useState<StudioState>({
    nodes: [],
    connections: [],
    selectedNodeId: null,
  });
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [engineRunning, setEngineRunning] = useState(false);
  const [meterDb, setMeterDb] = useState(-100);
  const [pendingCable, setPendingCable] = useState<{
    fromNodeId: string;
    fromPortId: string;
    signalType: 'mic' | 'line' | 'speaker' | 'digital';
  } | null>(null);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
  const [sfvMode, setSfvMode] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [lessonPreset, setLessonPreset] = useState<'none' | 'pro-vocal-chain'>('none');

  const activeScenario = scenarios[0]!;
  const [completedObjectives, setCompletedObjectives] = useState<Set<string>>(new Set());
  const [scenarioHintId, setScenarioHintId] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    void audioEngine.start().then(() => {
      try {
        const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<StudioState>;
        if (!parsed.nodes || !parsed.connections) return;
        setState({
          nodes: parsed.nodes,
          connections: parsed.connections,
          selectedNodeId: null,
        });
        parsed.nodes.forEach((node) => {
          const def = equipmentLibrary.find((d) => d.id === node.defId);
          if (!def) return;
          if (def.category === 'signal-gen') {
            audioEngine.createSourceNode(node.id, 'sine');
          } else if (def.category === 'microphone') {
            audioEngine.createSourceNode(node.id, 'noise');
          } else {
            audioEngine.ensurePatchNode(node.id, def.id);
          }
          audioEngine.registerNodeProfile(node.id, node.defId, node.state ?? {});
        });
      } catch {
        // Ignore malformed workspace blobs.
      }
    });
  }, []);

  useEffect(() => {
    try {
      const toStore = JSON.stringify({
        nodes: state.nodes,
        connections: state.connections,
      });
      localStorage.setItem(WORKSPACE_STORAGE_KEY, toStore);
    } catch {
      // best effort persistence
    }
  }, [state.nodes, state.connections]);

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

  useEffect(() => {
    audioEngine.syncConnections(
      state.connections.map((c) => ({
        fromNodeId: c.fromNodeId,
        toNodeId: c.toNodeId,
        fromPortId: c.fromPortId,
        toPortId: c.toPortId,
      }))
    );
  }, [state.connections]);

  const handleAddGear = useCallback(async (defId: string) => {
    const def = equipmentLibrary.find((d) => d.id === defId);
    if (!def) return;

    await audioEngine.start();
    setEngineRunning(audioEngine.isRunning);

    const nodeId = `node-${Date.now()}`;
    const rackNodes = state.nodes
      .map((node) => {
        const nodeDef = equipmentLibrary.find((d) => d.id === node.defId);
        if (!nodeDef || nodeDef.heightUnits <= 0) return null;
        return { node, nodeDef };
      })
      .filter((entry): entry is { node: EquipmentNode; nodeDef: EquipmentDef } => Boolean(entry));
    const totalRackUnits = rackNodes.reduce((sum, entry) => sum + entry.nodeDef.heightUnits, 0);
    const rackTop = 44;
    const rackX = 300;
    const nextY = rackTop + totalRackUnits * 44;

    const defaultState: Record<string, unknown> = {};
    if (def.category === 'preamp') {
      defaultState.phantomPower = false;
      defaultState.phantom = false;
    }
    const newNode: EquipmentNode = {
      id: nodeId,
      defId,
      x: def.heightUnits > 0 ? rackX : 420,
      y: def.heightUnits > 0 ? nextY : 420,
      rotation: 0,
      state: defaultState,
    };

    audioEngine.createNode(nodeId, defId);
    audioEngine.registerNodeProfile(nodeId, defId, newNode.state);

    setState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      selectedNodeId: newNode.id,
    }));
  }, [state.nodes]);

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
    (nodeId: string, controlId: string, value: number | boolean | string) => {
      setState((prev) => {
        const node = prev.nodes.find((nn) => nn.id === nodeId);
        const def = node
          ? equipmentLibrary.find((d) => d.id === node.defId)
          : undefined;
        if (def && typeof value === 'number') {
          const ctrl = def.controls.find((c) => c.id === controlId);
          if (controlId.endsWith('-fader')) {
            if (def.id === 'professional-mixer-console') {
              const rawState = { ...(node?.state ?? {}), [controlId]: value };
              const channelLevels = [1, 2, 3, 4, 5].map((idx) =>
                Number(rawState[`ch-${idx}-fader`] ?? 70)
              );
              const channelAvg =
                channelLevels
                  .map((v) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 2.25))
                  .reduce((sum, v) => sum + v, 0) /
                channelLevels.length;
              const masterNorm = Math.pow(
                Math.max(0, Math.min(1, Number(rawState['master-fader'] ?? 70) / 100)),
                2.25
              );
              audioEngine.setNodeGain(nodeId, masterNorm * channelAvg);
            } else {
              audioEngine.setNodeGain(
                nodeId,
                Math.max(0, Math.min(1, value / 100))
              );
            }
          }
          if (ctrl?.type === 'knob' && ctrl.min != null && ctrl.max != null) {
            const norm =
              (value - ctrl.min) / (ctrl.max - ctrl.min);
            const safe = Math.max(0, Math.min(1, norm));
            if (
              controlId === 'gain' ||
              controlId === 'input' ||
              controlId === 'level'
            ) {
              if (controlId === 'level' && ctrl.min != null && ctrl.max != null) {
                const db = value;
                const amp = Math.pow(10, db / 20);
                audioEngine.setNodeGain(nodeId, Math.max(0, Math.min(1, amp)));
              } else {
                audioEngine.setNodeGain(nodeId, safe);
              }
            }
            if (
              controlId === 'mid-freq' ||
              controlId === 'low-freq' ||
              controlId === 'high-freq'
            ) {
              audioEngine.setFrequency(nodeId, 80 + safe * 8000);
            }
            if (controlId === 'frequency') {
              audioEngine.setFrequency(nodeId, value);
            }
          }
        }
        if (def && controlId === 'waveform' && typeof value === 'string') {
          const wave =
            value === 'noise' || value === 'square' || value === 'triangle' || value === 'sawtooth'
              ? value
              : 'sine';
          audioEngine.setSourceMode(nodeId, wave);
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
        const toNode = prev.nodes.find((n) => n.id === toNodeId);
        const toDef = toNode
          ? equipmentLibrary.find((d) => d.id === toNode.defId)
          : undefined;
        const fromPort = fromDef?.outputs.find((p) => p.id === fromPortId);
        const toPort = toDef?.inputs.find((p) => p.id === toPortId);
        if (fromPort?.type === 'speaker' && toPort?.type === 'mic') {
          return prev;
        }
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
        audioEngine.connectNodes(fromNodeId, toNodeId, fromPortId, toPortId);
      }
    },
    []
  );

  const ws = useMemo(() => ({
    addNode: (defId: string, _x?: number, _y?: number) => handleAddGear(defId),
    addCable: (
      fromNodeId: string,
      fromPortId: string,
      toNodeId: string,
      toPortId: string
    ) => handleConnect(fromNodeId, fromPortId, toNodeId, toPortId),
  }), [handleAddGear, handleConnect]);

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCableId) {
        setState((prev) => ({
          ...prev,
          connections: prev.connections.filter((c) => c.id !== selectedCableId),
        }));
        setSelectedCableId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCableId]);

  const clearWorkspace = useCallback(() => {
    state.nodes.forEach((n) => audioEngine.disconnectNode(n.id));
    audioEngine.syncConnections([]);
    setState({
      nodes: [],
      connections: [],
      selectedNodeId: null,
    });
    setSelectedCableId(null);
    try {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch {
      // no-op
    }
  }, [state.nodes]);

  const exportWorkspace = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ nodes: state.nodes, connections: state.connections }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-flow-workspace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.nodes, state.connections]);

  const hydrateWorkspace = useCallback((next: StudioState) => {
    state.nodes.forEach((n) => audioEngine.disconnectNode(n.id));
    next.nodes.forEach((node) => {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) return;
      if (def.category === 'signal-gen') {
        audioEngine.createSourceNode(node.id, 'sine');
      } else if (def.category === 'microphone') {
        audioEngine.createSourceNode(node.id, 'noise');
      } else {
        audioEngine.ensurePatchNode(node.id, def.id);
      }
      audioEngine.registerNodeProfile(node.id, node.defId, node.state ?? {});
    });
    setState(next);
  }, [state.nodes]);

  const loadLesson = useCallback(() => {
    if (lessonPreset !== 'pro-vocal-chain') return;
    const nodes: EquipmentNode[] = [
      { id: 'lesson-u87', defId: 'u87-condenser', x: 120, y: 380, rotation: 0, state: {} },
      { id: 'lesson-neve', defId: 'neve-1073', x: 300, y: 44, rotation: 0, state: { phantomPower: true, phantom: true } },
      { id: 'lesson-la2a', defId: 'la-2a-leveling', x: 300, y: 88, rotation: 0, state: {} },
      { id: 'lesson-1176', defId: '1176-peak-limiter', x: 300, y: 220, rotation: 0, state: {} },
      { id: 'lesson-mixer', defId: 'professional-mixer-console', x: 300, y: 308, rotation: 0, state: {} },
    ];
    const connections = [
      { id: 'lesson-c1', fromNodeId: 'lesson-u87', fromPortId: 'xlr', toNodeId: 'lesson-neve', toPortId: 'mic-in', cableColor: 'mic' },
      { id: 'lesson-c2', fromNodeId: 'lesson-neve', fromPortId: 'line-out', toNodeId: 'lesson-la2a', toPortId: 'in', cableColor: 'line' },
      { id: 'lesson-c3', fromNodeId: 'lesson-la2a', fromPortId: 'out', toNodeId: 'lesson-1176', toPortId: 'in', cableColor: 'line' },
      { id: 'lesson-c4', fromNodeId: 'lesson-1176', fromPortId: 'out', toNodeId: 'lesson-mixer', toPortId: 'ch-in-1', cableColor: 'line' },
    ];
    hydrateWorkspace({
      nodes,
      connections,
      selectedNodeId: 'lesson-neve',
    });
  }, [hydrateWorkspace, lessonPreset]);

  const importWorkspace = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<StudioState>;
    if (!parsed.nodes || !parsed.connections) return;
    hydrateWorkspace({
      nodes: parsed.nodes,
      connections: parsed.connections,
      selectedNodeId: null,
    });
  }, [hydrateWorkspace]);

  const capturePng = useCallback(() => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-flow-rack-${Date.now()}.png`;
    a.click();
  }, []);

  return (
    <div className="flex h-[calc(100vh-2.5rem)] w-full flex-col overflow-hidden bg-[#0a0a0a] text-sm text-white">
      <div className="h-full flex min-h-0 flex-1 overflow-hidden bg-[#0a0a0a]">
        <div
          className={`flex shrink-0 flex-col overflow-hidden border-r border-white/10 bg-neutral-900/80 backdrop-blur-xl font-medium transition-all duration-300 ${
            showLeftSidebar ? 'w-64' : 'w-0 border-r-0'
          }`}
        >
          {showLeftSidebar && (
            <div className="border-b border-white/10 p-2">
              <button
                type="button"
                onClick={clearWorkspace}
                className="w-full rounded border border-red-500/40 bg-red-900/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-200 hover:bg-red-900/35"
              >
                Clear Workspace
              </button>
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={exportWorkspace}
                  className="flex-1 rounded border border-blue-400/40 bg-blue-900/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-100 hover:bg-blue-900/35"
                >
                  Export Lab
                </button>
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="flex-1 rounded border border-emerald-400/40 bg-emerald-900/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-900/35"
                >
                  Import Lab
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importWorkspace(file);
                    e.currentTarget.value = '';
                  }}
                />
              </div>
              <div className="mt-2 flex gap-1">
                <select
                  value={lessonPreset}
                  onChange={(e) => setLessonPreset(e.target.value as 'none' | 'pro-vocal-chain')}
                  className="flex-1 rounded border border-white/20 bg-black/30 px-2 py-1 text-[10px]"
                >
                  <option value="none">Lessons</option>
                  <option value="pro-vocal-chain">Lesson 1: Pro Vocal Chain</option>
                </select>
                <button
                  type="button"
                  onClick={loadLesson}
                  className="rounded border border-violet-300/40 bg-violet-900/25 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-100 hover:bg-violet-900/40"
                >
                  Load
                </button>
              </div>
            </div>
          )}
          {showLeftSidebar && <EquipmentLibraryPanel onAddEquipment={(defId) => ws.addNode(defId)} />}
        </div>

        <div className="relative min-h-0 min-w-0 flex-1">
          <Renderer
            state={state}
            zoom={zoom}
            onSelectNode={(id) =>
              setState((prev) => ({ ...prev, selectedNodeId: id }))
            }
            onUpdateNode={handleUpdateNode}
            onControlChange={handleCanvasControl}
            onConnect={handleConnect}
            onAddCable={ws.addCable}
            sfvMode={sfvMode}
            blueprintMode={blueprintMode}
            onCanvasReady={(el) => {
              canvasElementRef.current = el;
            }}
            selectedCableId={selectedCableId}
            onSelectCable={setSelectedCableId}
            onPortMouseDown={(nodeId, portId, signalType) => {
              setPendingCable({
                fromNodeId: nodeId,
                fromPortId: portId,
                signalType,
              });
            }}
            onPortMouseUp={(fromNodeId, fromPortId) => {
              setPendingCable((prev) =>
                prev &&
                prev.fromNodeId === fromNodeId &&
                prev.fromPortId === fromPortId
                  ? null
                  : prev
              );
            }}
          />
          <button
            type="button"
            onClick={() => setShowLeftSidebar((v) => !v)}
            className="absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-r border border-white/15 bg-black/70 px-1.5 py-3 text-[10px] font-bold"
            aria-label={showLeftSidebar ? 'Hide equipment sidebar' : 'Show equipment sidebar'}
          >
            {showLeftSidebar ? '<' : '>'}
          </button>
          <button
            type="button"
            onClick={() => setShowRightSidebar((v) => !v)}
            className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-l border border-white/15 bg-black/70 px-1.5 py-3 text-[10px] font-bold"
            aria-label={showRightSidebar ? 'Hide tools sidebar' : 'Show tools sidebar'}
          >
            {showRightSidebar ? '>' : '<'}
          </button>

          <div className="absolute right-4 top-4 z-20 flex gap-2">
            <button
              type="button"
              onClick={capturePng}
              className="h-8 w-8 rounded border border-white/10 bg-black/60 text-[12px]"
            >
              📷
            </button>
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
        <div
          className={`flex h-full min-w-0 flex-col overflow-hidden border-l border-white/10 bg-neutral-900/80 backdrop-blur-xl font-medium transition-all duration-300 ${
            showRightSidebar ? 'w-96 min-w-[384px]' : 'w-0 border-l-0'
          }`}
        >
          <Tabs
            defaultValue="inspector"
            className={`flex h-full min-h-0 min-w-0 flex-col ${showRightSidebar ? '' : 'hidden'}`}
          >
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
                  node={inspectorNode as any}
                  def={selectedDef as EquipmentDef}
                  onUpdateSetting={onUpdateSetting}
                  onRemove={onRemoveNode}
                  allNodes={allNodesAdapted as any}
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

      <footer className="flex h-10 shrink-0 items-center gap-6 border-t border-white/10 bg-[#141414] px-4">
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
          {pendingCable && (
            <span className="font-mono text-[9px] text-[#889]">
              PATCHING {pendingCable.signalType.toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setSfvMode((v) => !v)}
            className={`rounded border px-2 py-1 text-[9px] font-bold uppercase ${sfvMode ? 'border-emerald-400 bg-emerald-900/40 text-emerald-100' : 'border-white/20 bg-black/20 text-white/70'}`}
          >
            SFV
          </button>
          <button
            type="button"
            onClick={() => setBlueprintMode((v) => !v)}
            className={`rounded border px-2 py-1 text-[9px] font-bold uppercase ${blueprintMode ? 'border-sky-400 bg-sky-900/40 text-sky-100' : 'border-white/20 bg-black/20 text-white/70'}`}
          >
            Blueprint
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-end gap-2 rounded border border-white/10 bg-black/35 px-2 py-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#888]">VU</span>
              <VUMeter level={meterDb} label="" />
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#888]">PK</span>
              <PeakMeter level={meterDb} label="" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Lab;
