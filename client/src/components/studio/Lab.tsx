import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Renderer from './Renderer';
import ProfessionalMixerConsole from './ProfessionalMixerConsole';
import { PatchbayPanel } from './PatchbayPanel';
import { WorkspaceMinimap } from './WorkspaceMinimap';
import StudioGearPickers, { DEF_MIME } from './StudioGearPickers';
import InspectorPanel from '../InspectorPanel';
import ScenarioPanel from '../ScenarioPanel';
import AssistantPanel from '../AssistantPanel';
import MonitorMixPanel from '../MonitorMixPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { snapRackNodePosition } from '@/lib/canvas-equipment-graphics';
import {
  getWorkspaceZones,
  WORKSPACE_WORLD_W,
  WORKSPACE_WORLD_H,
  RACK_GRID_TOP_PX,
  RACK_GRID_BOTTOM_PX,
  nextStageSlot,
  nextRackSlot,
  defaultRackColumnX,
  STAGE_RACK_GAP_PX,
} from '@/lib/studio-layout';
import { useSetStudioHeaderRight } from '@/contexts/StudioHeaderContext';
import type { StudioState, EquipmentNode, Connection } from '../../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';
import { defaultRackEquipmentState, equipmentLibrary } from '@/lib/equipment-library';
import { audioEngine } from '@/lib/audio-engine-v2';
import { scenarios } from '@/lib/scenarios';
import { isFoundationalMixerNodeId } from '@/lib/foundational-mixer-anchors';

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

function clampPanToWorld(pan: { x: number; y: number }, vw: number, vh: number) {
  return {
    x: Math.min(Math.max(0, pan.x), Math.max(0, WORKSPACE_WORLD_W - vw)),
    y: Math.min(Math.max(0, pan.y), Math.max(0, WORKSPACE_WORLD_H - vh)),
  };
}

function mergeRackPowerDefaults(nodes: EquipmentNode[]): EquipmentNode[] {
  return nodes.map((node) => {
    const def = equipmentLibrary.find((d) => d.id === node.defId);
    if (!def || def.heightUnits <= 0) return node;
    const st = node.state ?? {};
    if (st.power !== undefined) return node;
    return { ...node, state: { ...st, power: true } };
  });
}

const MIXER_H_MIN = 180;
const MIXER_H_MAX = 560;

const Lab: React.FC = () => {
  const WORKSPACE_STORAGE_KEY = 'signal-flow-workspace-v3';
  const [state, setState] = useState<StudioState>({
    nodes: [],
    connections: [],
    selectedNodeId: null,
  });
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [engineRunning, setEngineRunning] = useState(false);
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
  const viewportMetricsRef = useRef({ w: 1280, h: 800 });
  const [viewMetrics, setViewMetrics] = useState({ w: 1280, h: 800 });
  const [canvasPan, setCanvasPan] = useState(() =>
    clampPanToWorld(
      {
        x: Math.max(0, (WORKSPACE_WORLD_W - 1280) / 2),
        y: Math.max(0, (WORKSPACE_WORLD_H - 800) / 2),
      },
      1280,
      800
    )
  );
  const [mixerHeightPx, setMixerHeightPx] = useState(300);
  const mixerResizeRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    void audioEngine.start();
    audioEngine.ensureFoundationalMixer();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = mixerResizeRef.current;
      if (!d) return;
      const dy = d.startY - e.clientY;
      const next = Math.min(MIXER_H_MAX, Math.max(MIXER_H_MIN, d.startH + dy));
      setMixerHeightPx(next);
    };
    const onUp = () => {
      mixerResizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
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
    setEngineRunning(audioEngine.isRunning && audioEngine.audioContext?.state === 'running');

    const zones = getWorkspaceZones();

    const defaultState: Record<string, unknown> = {
      ...(def.heightUnits > 0 ? defaultRackEquipmentState() : {}),
    };
    if (def.category === 'preamp') {
      defaultState.phantomPower = false;
      defaultState.phantom = false;
    }

    const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let created = false;

    setState((prev) => {
      const pos =
        def.heightUnits > 0
          ? nextRackSlot(prev.nodes, def, zones, equipmentLibrary)
          : nextStageSlot(prev.nodes, def, zones, equipmentLibrary);
      if (def.heightUnits > 0) {
        const rackBottom = pos.y + def.heightUnits * 44;
        if (rackBottom > RACK_GRID_BOTTOM_PX) {
          return prev;
        }
      }
      const newNode: EquipmentNode = {
        id: nodeId,
        defId,
        x: pos.x,
        y: pos.y,
        rotation: 0,
        state: defaultState,
      };
      created = true;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode],
        selectedNodeId: newNode.id,
      };
    });

    if (!created && def.heightUnits > 0) return;
    audioEngine.createNode(nodeId, defId);
    audioEngine.registerNodeProfile(nodeId, defId, defaultState);
  }, []);

  const handleUpdateNode = useCallback((id: string, x: number, y: number) => {
    const zones = getWorkspaceZones();
    setState((ws) => {
      const node = ws.nodes.find((n) => n.id === id);
      if (!node) return ws;
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) return ws;

      let snappedPos: { x: number; y: number };
      if (def.heightUnits > 0) {
        snappedPos = snapRackNodePosition(
          x,
          y,
          def.width,
          def.heightUnits,
          WORKSPACE_WORLD_W,
          WORKSPACE_WORLD_H
        );
        const maxY = Math.max(
          RACK_GRID_TOP_PX,
          RACK_GRID_BOTTOM_PX - def.heightUnits * 44
        );
        snappedPos.y = Math.min(Math.max(RACK_GRID_TOP_PX, snappedPos.y), maxY);
      } else {
        const w = def.width;
        const h = def.heightUnits > 0 ? def.heightUnits * 44 : 100;
        const pad = 16;
        const maxX = Math.max(
          pad,
          zones.splitX - STAGE_RACK_GAP_PX - w - pad
        );
        snappedPos = {
          x: Math.min(Math.max(pad, x), maxX),
          y: Math.min(Math.max(40, y), WORKSPACE_WORLD_H - h - 20),
        };
      }
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

  const handlePlay = useCallback(async () => {
    await audioEngine.start();
    audioEngine.setMasterGain(0.5);
    setEngineRunning(
      audioEngine.isRunning && audioEngine.audioContext?.state === 'running'
    );
  }, []);

  const handleStop = useCallback(async () => {
    await audioEngine.suspendOutputWithRampDown();
    setEngineRunning(false);
  }, []);

  const setHeaderRight = useSetStudioHeaderRight();

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
    if (isFoundationalMixerNodeId(id)) return;
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

  const latestNodesRef = useRef(state.nodes);
  latestNodesRef.current = state.nodes;

  const hydrateWorkspace = useCallback((next: StudioState) => {
    latestNodesRef.current.forEach((n) => audioEngine.disconnectNode(n.id));
    audioEngine.ensureFoundationalMixer();
    const merged = mergeRackPowerDefaults(next.nodes);
    merged.forEach((node) => {
      const def = equipmentLibrary.find((d) => d.id === node.defId);
      if (!def) return;
      audioEngine.createNode(node.id, node.defId);
      audioEngine.registerNodeProfile(node.id, node.defId, node.state ?? {});
    });
    setState({
      ...next,
      nodes: merged,
      selectedNodeId: next.selectedNodeId ?? null,
    });
  }, []);

  const loadLesson = useCallback(() => {
    if (lessonPreset !== 'pro-vocal-chain') return;
    const zones = getWorkspaceZones();
    const rx = defaultRackColumnX(zones, 400);
    const nodes: EquipmentNode[] = [
      { id: 'lesson-u87', defId: 'u87-condenser', x: 96, y: 300, rotation: 0, state: {} },
      { id: 'lesson-neve', defId: 'neve-1073', x: rx, y: 44, rotation: 0, state: { phantomPower: true, phantom: true } },
      { id: 'lesson-la2a', defId: 'la-2a-leveling', x: rx, y: 88, rotation: 0, state: {} },
      { id: 'lesson-1176', defId: '1176-peak-limiter', x: rx, y: 220, rotation: 0, state: {} },
      { id: 'lesson-mixer', defId: 'professional-mixer-console', x: rx, y: 308, rotation: 0, state: {} },
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
  const handleCanvasPanChange = useCallback((x: number, y: number) => {
    setCanvasPan(clampPanToWorld({ x, y }, viewMetrics.w, viewMetrics.h));
  }, [viewMetrics.w, viewMetrics.h]);
  useEffect(() => {
    if (!setHeaderRight) return;
    setHeaderRight(
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="hidden font-mono text-[9px] text-neutral-500 md:inline">
          {engineRunning ? 'RUNNING' : 'SUSPENDED'}
        </span>
        {pendingCable && (
          <span className="hidden font-mono text-[9px] text-neutral-400 sm:inline">
            PATCH {pendingCable.signalType.toUpperCase()}
          </span>
        )}
        <button
          type="button"
          onClick={() => void handlePlay()}
          className="rounded bg-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-600"
        >
          Play
        </button>
        <button
          type="button"
          onClick={() => void handleStop()}
          className="rounded bg-red-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-800"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={clearWorkspace}
          className="rounded border border-red-500/35 bg-red-950/30 px-2 py-1 text-[9px] font-bold uppercase text-red-100 hover:bg-red-900/45"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={exportWorkspace}
          className="rounded border border-blue-400/35 bg-blue-950/25 px-2 py-1 text-[9px] font-bold uppercase text-blue-100 hover:bg-blue-900/40"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => importFileRef.current?.click()}
          className="rounded border border-emerald-400/35 bg-emerald-950/25 px-2 py-1 text-[9px] font-bold uppercase text-emerald-100 hover:bg-emerald-900/40"
        >
          Import
        </button>
        <select
          value={lessonPreset}
          onChange={(e) =>
            setLessonPreset(e.target.value as 'none' | 'pro-vocal-chain')
          }
          className="max-w-[10rem] rounded border border-white/15 bg-black/40 px-1.5 py-1 text-[9px] text-white/90"
        >
          <option value="none">Lessons</option>
          <option value="pro-vocal-chain">Pro Vocal Chain</option>
        </select>
        <button
          type="button"
          onClick={loadLesson}
          className="rounded border border-violet-400/35 bg-violet-950/30 px-2 py-1 text-[9px] font-bold uppercase text-violet-100 hover:bg-violet-900/45"
        >
          Load
        </button>
        <button
          type="button"
          onClick={() => setSfvMode((v) => !v)}
          className={`rounded border px-2 py-1 text-[9px] font-bold uppercase ${
            sfvMode
              ? 'border-emerald-400 bg-emerald-900/45 text-emerald-100'
              : 'border-white/20 bg-black/35 text-white/75'
          }`}
        >
          SFV
        </button>
        <button
          type="button"
          onClick={() => setBlueprintMode((v) => !v)}
          className={`rounded border px-2 py-1 text-[9px] font-bold uppercase ${
            blueprintMode
              ? 'border-sky-400 bg-sky-900/45 text-sky-100'
              : 'border-white/20 bg-black/35 text-white/75'
          }`}
        >
          Blueprint
        </button>
      </div>
    );
    return () => setHeaderRight(null);
  }, [
    setHeaderRight,
    engineRunning,
    pendingCable,
    handlePlay,
    handleStop,
    clearWorkspace,
    exportWorkspace,
    lessonPreset,
    loadLesson,
    sfvMode,
    blueprintMode,
  ]);

  const worldZones = useMemo(() => getWorkspaceZones(), []);
  const pickerButtonStyles = useMemo(() => {
    const stageWorldX = Math.max(80, worldZones.rackLeft * 0.5);
    const stageWorldY = canvasPan.y + viewMetrics.h * 0.5;
    const rackWorldX = (worldZones.rackLeft + worldZones.rackRight) * 0.5;
    const rackWorldY = canvasPan.y + viewMetrics.h * 0.42;
    return {
      stage: {
        left: `${(stageWorldX - canvasPan.x) * zoom}px`,
        top: `${(stageWorldY - canvasPan.y) * zoom}px`,
      } as React.CSSProperties,
      rack: {
        left: `${(rackWorldX - canvasPan.x) * zoom}px`,
        top: `${(rackWorldY - canvasPan.y) * zoom}px`,
      } as React.CSSProperties,
    };
  }, [worldZones, canvasPan.x, canvasPan.y, viewMetrics.h, zoom]);
  const focusConnection = useCallback((c: Connection) => {
    const fromNode = state.nodes.find((n) => n.id === c.fromNodeId);
    const toNode = state.nodes.find((n) => n.id === c.toNodeId);
    if (!fromNode || !toNode) return;
    const fromDef = equipmentLibrary.find((d) => d.id === fromNode.defId);
    const toDef = equipmentLibrary.find((d) => d.id === toNode.defId);
    if (!fromDef || !toDef) return;
    const fromH = fromDef.heightUnits > 0 ? fromDef.heightUnits * 44 : 100;
    const toH = toDef.heightUnits > 0 ? toDef.heightUnits * 44 : 100;
    const cx =
      (fromNode.x + fromDef.width * 0.5 + toNode.x + toDef.width * 0.5) * 0.5;
    const cy = (fromNode.y + fromH * 0.5 + toNode.y + toH * 0.5) * 0.5;
    setCanvasPan((prev) =>
      clampPanToWorld(
        {
          x: cx - viewMetrics.w * 0.5,
          y: cy - viewMetrics.h * 0.5,
        },
        viewMetrics.w,
        viewMetrics.h
      )
    );
  }, [state.nodes, viewMetrics.w, viewMetrics.h]);

  return (
    <div className="flex h-[calc(100vh-52px)] w-full flex-col overflow-hidden bg-[#0a0a0a] text-sm text-white">
      <div className="flex min-h-0 flex-1 overflow-hidden bg-[#0a0a0a]">
        <div
          className="relative min-h-0 min-w-0 flex-1"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(DEF_MIME)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData(DEF_MIME);
            if (id) void ws.addNode(id);
          }}
        >
          <Renderer
            state={state}
            zoom={zoom}
            workspaceWorldW={WORKSPACE_WORLD_W}
            workspaceWorldH={WORKSPACE_WORLD_H}
            canvasPanX={canvasPan.x}
            canvasPanY={canvasPan.y}
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
            onViewportWorldSize={(vw, vh) => {
              viewportMetricsRef.current = { w: vw, h: vh };
              setViewMetrics({ w: vw, h: vh });
              setCanvasPan((prev) => clampPanToWorld(prev, vw, vh));
            }}
            onCanvasPanChange={handleCanvasPanChange}
            selectedCableId={selectedCableId}
            onSelectCable={setSelectedCableId}
            onPortMouseDown={(nodeId, portId, signalType) => {
              setPendingCable({
                fromNodeId: nodeId,
                fromPortId: portId,
                signalType,
              });
            }}
            onPortMouseUp={(fromNodeId, fromPortId, _toNodeId, _toPortId) => {
              setPendingCable((prev) =>
                prev &&
                prev.fromNodeId === fromNodeId &&
                prev.fromPortId === fromPortId
                  ? null
                  : prev
              );
            }}
          />
          <StudioGearPickers
            onPick={(defId) => void ws.addNode(defId)}
            stageButtonStyle={pickerButtonStyles.stage}
            rackButtonStyle={pickerButtonStyles.rack}
          />
          <button
            type="button"
            onClick={() => setShowRightSidebar((v) => !v)}
            className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-l border border-white/15 bg-black/70 px-1.5 py-3 text-[10px] font-bold"
            aria-label={showRightSidebar ? 'Hide tools sidebar' : 'Show tools sidebar'}
          >
            {showRightSidebar ? '>' : '<'}
          </button>

          <div className="absolute right-4 top-3 z-30 flex gap-2">
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

          <div className="pointer-events-none absolute bottom-3 right-3 z-30">
            <WorkspaceMinimap
              worldW={WORKSPACE_WORLD_W}
              worldH={WORKSPACE_WORLD_H}
              panX={canvasPan.x}
              panY={canvasPan.y}
              viewW={viewMetrics.w}
              viewH={viewMetrics.h}
              nodes={state.nodes}
              rackLeft={worldZones.rackLeft}
              rackRight={worldZones.rackRight}
              onPanChange={(x, y) =>
                setCanvasPan(clampPanToWorld({ x, y }, viewMetrics.w, viewMetrics.h))
              }
            />
          </div>
        </div>

        {/* Right — Tabbed tools */}
        <div
          className={`flex h-full min-w-0 flex-col overflow-hidden border-l border-white/10 bg-neutral-900/80 backdrop-blur-xl font-medium transition-all duration-300 ${
            showRightSidebar ? 'w-96 min-w-[384px]' : 'w-0 border-l-0'
          }`}
        >
          <div className={showRightSidebar ? 'shrink-0' : 'hidden'}>
            <PatchbayPanel
              nodes={state.nodes}
              connections={state.connections}
              selectedCableId={selectedCableId}
              onSelectCable={setSelectedCableId}
              onFocusConnection={focusConnection}
            />
          </div>
          <Tabs
            defaultValue="inspector"
            className={`flex min-h-0 min-w-0 flex-1 flex-col ${showRightSidebar ? '' : 'hidden'}`}
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

      <div
        className="flex shrink-0 flex-col border-t border-white/10 bg-[#0a0a0a]"
        style={{ height: mixerHeightPx }}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize mixer height"
          onMouseDown={(e) => {
            e.preventDefault();
            mixerResizeRef.current = { startY: e.clientY, startH: mixerHeightPx };
          }}
          className="h-1.5 shrink-0 cursor-ns-resize border-b border-amber-500/40 bg-amber-950/50 hover:bg-amber-500/30"
        />
        <ProfessionalMixerConsole className="min-h-0 flex-1 border-t-0" />
      </div>

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
  );
};

export default Lab;
