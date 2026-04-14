import { useState, useCallback, useRef, useEffect } from 'react';
import type { EquipmentNode, Cable, SignalLevel } from '../../../shared/equipment-types';
import { getEquipmentById, signalColors } from '../lib/equipment-library';
import { nanoid } from 'nanoid';

export interface DragState {
  type: 'node' | 'cable' | 'pan';
  nodeId?: string;
  offsetX?: number;
  offsetY?: number;
  fromNodeId?: string;
  fromPortId?: string;
  fromPortType?: SignalLevel;
  cursorX?: number;
  cursorY?: number;
  startX?: number;
  startY?: number;
}

export function useWorkspace() {
  const [nodes, setNodes] = useState<EquipmentNode[]>([]);
  const [cables, setCables] = useState<Cable[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredPortInfo, setHoveredPortInfo] = useState<{ nodeId: string; portId: string } | null>(null);

  /** Add equipment to workspace */
  const addNode = useCallback((defId: string, x: number, y: number) => {
    const def = getEquipmentById(defId);
    if (!def) return;

    const settings: Record<string, number | boolean | string> = {};
    def.controls.forEach(c => {
      settings[c.id] = c.default;
    });

    const signalLevels: Record<string, number> = {};
    [...def.inputs, ...def.outputs].forEach(p => {
      signalLevels[p.id] = -100;
    });

    const node: EquipmentNode = {
      instanceId: nanoid(8),
      defId,
      x,
      y,
      settings,
      signalLevels,
    };

    setNodes(prev => [...prev, node]);
    setSelectedNodeId(node.instanceId);
    return node.instanceId;
  }, []);

  /** Remove equipment from workspace */
  const removeNode = useCallback((instanceId: string) => {
    // Disconnect audio node if it exists
    try {
      const { audioEngine } = require('../lib/audio-engine-v2');
      if (audioEngine?.disconnectNode) {
        audioEngine.disconnectNode(instanceId);
      }
    } catch (e) {
      // Audio engine not loaded yet
    }
    
    setNodes(prev => prev.filter(n => n.instanceId !== instanceId));
    setCables(prev => prev.filter(c => c.fromNodeId !== instanceId && c.toNodeId !== instanceId));
    if (selectedNodeId === instanceId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  /** Clear all nodes and disconnect audio */
  const clearAllNodes = useCallback(() => {
    try {
      const { audioEngine } = require('../lib/audio-engine-v2');
      if (audioEngine?.stop) {
        audioEngine.stop();
      }
    } catch (e) {
      // Audio engine not loaded yet
    }
    setNodes([]);
    setCables([]);
    setSelectedNodeId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        const { audioEngine } = require('../lib/audio-engine-v2');
        if (audioEngine?.stop) {
          audioEngine.stop();
        }
      } catch (e) {
        // Audio engine not loaded yet
      }
    };
  }, []);

  /** Update node position */
  const moveNode = useCallback((instanceId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n =>
      n.instanceId === instanceId ? { ...n, x, y } : n
    ));
  }, []);

  /** Update node settings */
  const updateNodeSetting = useCallback((instanceId: string, key: string, value: number | boolean | string) => {
    setNodes(prev => prev.map(n =>
      n.instanceId === instanceId
        ? { ...n, settings: { ...n.settings, [key]: value } }
        : n
    ));
  }, []);

  /** Add cable connection */
  const addCable = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string): boolean => {
    // Validate connection
    const fromNode = nodes.find(n => n.instanceId === fromNodeId);
    const toNode = nodes.find(n => n.instanceId === toNodeId);
    if (!fromNode || !toNode) return false;

    const fromDef = getEquipmentById(fromNode.defId);
    const toDef = getEquipmentById(toNode.defId);
    if (!fromDef || !toDef) return false;

    const fromPort = fromDef.outputs.find(p => p.id === fromPortId);
    const toPort = toDef.inputs.find(p => p.id === toPortId);
    if (!fromPort || !toPort) return false;

    // Check signal type compatibility
    if (fromPort.type !== toPort.type) return false;

    // Check if port already has a connection
    const existingCable = cables.find(c =>
      (c.toNodeId === toNodeId && c.toPortId === toPortId)
    );
    if (existingCable) return false;

    const cable: Cable = {
      id: nanoid(8),
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
      signalType: fromPort.type,
    };

    setCables(prev => [...prev, cable]);
    return true;
  }, [nodes, cables]);

  /** Remove cable */
  const removeCable = useCallback((cableId: string) => {
    setCables(prev => prev.filter(c => c.id !== cableId));
  }, []);

  /** Select a node */
  const selectNode = useCallback((instanceId: string | null) => {
    setSelectedNodeId(instanceId);
  }, []);

  /** Get selected node */
  const selectedNode = nodes.find(n => n.instanceId === selectedNodeId) || null;
  const selectedDef = selectedNode ? getEquipmentById(selectedNode.defId) : null;

  /** Pan/zoom controls */
  const panView = useCallback((dx: number, dy: number) => {
    setViewX(prev => prev + dx);
    setViewY(prev => prev + dy);
  }, []);

  const zoomView = useCallback((delta: number, centerX: number, centerY: number) => {
    setZoom(prev => {
      const newZoom = Math.max(0.25, Math.min(3, prev + delta));
      // Adjust view to zoom toward cursor
      const scale = newZoom / prev;
      setViewX(vx => centerX - (centerX - vx) * scale);
      setViewY(vy => centerY - (centerY - vy) * scale);
      return newZoom;
    });
  }, []);

  /** Reset workspace */
  const resetWorkspace = useCallback(() => {
    clearAllNodes();
    setViewX(0);
    setViewY(0);
    setZoom(1);
  }, [clearAllNodes]);

  /** Load workspace state */
  const loadState = useCallback((state: { nodes: EquipmentNode[]; cables: Cable[] }) => {
    setNodes(state.nodes);
    setCables(state.cables);
    setSelectedNodeId(null);
  }, []);

  /** Get current state for saving */
  const getState = useCallback(() => ({
    nodes,
    cables,
    viewX,
    viewY,
    zoom,
  }), [nodes, cables, viewX, viewY, zoom]);

  /** Compute signal levels through the chain */
  const computeSignalLevels = useCallback(() => {
    // Simple signal propagation: traverse from sources through connections
    const newNodes = [...nodes];
    const visited = new Set<string>();

    function propagate(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = newNodes.find(n => n.instanceId === nodeId);
      if (!node) return;
      const def = getEquipmentById(node.defId);
      if (!def) return;

      // Find incoming cables
      const incoming = cables.filter(c => c.toNodeId === nodeId);

      // Propagate from sources first
      incoming.forEach(c => propagate(c.fromNodeId));

      // Compute input level
      let inputLevel = -100;
      incoming.forEach(c => {
        const srcNode = newNodes.find(n => n.instanceId === c.fromNodeId);
        if (srcNode) {
          const srcLevel = srcNode.signalLevels[c.fromPortId] ?? -100;
          inputLevel = Math.max(inputLevel, srcLevel);
        }
      });

      // Apply processing based on equipment type
      let outputLevel = inputLevel;

      if (def.category === 'source') {
        outputLevel = (node.settings.level as number) ?? -20;
      } else if (def.category === 'preamp') {
        const gain = (node.settings.gain as number) ?? 0;
        const pad = (node.settings.pad as boolean) ? -20 : 0;
        outputLevel = inputLevel + gain + pad;
      } else if (def.category === 'compressor') {
        // Simplified compression
        const threshold = (node.settings.threshold as number) ?? 0;
        if (outputLevel > threshold) {
          const ratio = parseFloat(String(node.settings.ratio ?? '4'));
          const excess = outputLevel - threshold;
          outputLevel = threshold + excess / ratio;
        }
        const makeup = (node.settings.makeup as number) ?? (node.settings.output as number) ?? 0;
        outputLevel += makeup;
      } else if (def.category === 'console') {
        const fader = (node.settings.fader as number) ?? 0;
        const mute = (node.settings.mute as boolean) ?? false;
        outputLevel = mute ? -100 : inputLevel + fader;
      } else if (def.category === 'amplifier') {
        const power = (node.settings.power as boolean) ?? false;
        const level = (node.settings.level as number) ?? -20;
        outputLevel = power ? inputLevel + level + 30 : -100;
      }

      // Clipping detection
      node.isClipping = outputLevel > 24;

      // Set output levels
      def.outputs.forEach(p => {
        node.signalLevels[p.id] = outputLevel;
      });
      def.inputs.forEach(p => {
        node.signalLevels[p.id] = inputLevel;
      });
    }

    // Start from all nodes
    newNodes.forEach(n => propagate(n.instanceId));
    setNodes(newNodes);
  }, [nodes, cables]);

  return {
    nodes,
    cables,
    selectedNodeId,
    selectedNode,
    selectedDef,
    viewX,
    viewY,
    zoom,
    dragState,
    hoveredPortInfo,
    addNode,
    removeNode,
    moveNode,
    updateNodeSetting,
    addCable,
    removeCable,
    selectNode,
    panView,
    zoomView,
    resetWorkspace,
    setDragState,
    setHoveredPortInfo,
    loadState,
    getState,
    computeSignalLevels,
    clearAllNodes,
  };
}
