import React, { useState, useCallback } from 'react';
import Renderer from './Renderer';
import ProfessionalMixerConsole from './ProfessionalMixerConsole';
import { StudioState, EquipmentNode } from '../../../../shared/equipment-types';
import { equipmentLibrary } from '../../lib/equipment-library';
import { audioEngine } from '../../lib/audio-engine-v2';

const Lab: React.FC = () => {
  const [state, setState] = useState<StudioState>({
    nodes: [],
    connections: [],
    selectedNodeId: null
  });
  const [zoom, setZoom] = useState(1);

  const addGear = async (defId: string) => {
    // Resume/Start Audio Engine on first interaction
    await audioEngine.start();

    const def = equipmentLibrary.find(d => d.id === defId);
    if (!def) return;
    
    const nodeId = `node-${Date.now()}`;
    const newNode: EquipmentNode = {
      id: nodeId,
      defId,
      x: 100,
      y: 100,
      rotation: 0,
      state: {}
    };

    // Create corresponding audio node if it's a source
    if (def.category === 'source') {
      audioEngine.createSourceNode(nodeId, 'sine');
    }
    
    setState(prev => ({ ...prev, nodes: [...prev.nodes, newNode], selectedNodeId: newNode.id }));
  };

  const handleUpdateNode = useCallback((id: string, x: number, y: number) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== id) return n;
        const def = equipmentLibrary.find(d => d.id === n.defId);
        
        // --- 1U SNAPPING LOGIC ---
        // If x < 1200 (Rack Area), snap y to 44px intervals
        let finalY = y;
        if (x < 1200 && def && def.heightUnits > 0) {
          finalY = Math.round(y / 44) * 44;
        }

        return { ...n, x, y: finalY };
      })
    }));
  }, []);

  const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar - Equipment Browser */}
      <div className="w-64 border-r border-white/10 bg-[#161616] p-4 overflow-y-auto">
        <h2 className="text-[#E8A020] font-bold text-xs tracking-widest uppercase mb-4">Equipment Library</h2>
        <div className="flex flex-col gap-2">
          {equipmentLibrary.map(gear => (
            <button 
              key={gear.id}
              onClick={() => addGear(gear.id)}
              className="text-left p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] transition-all group"
            >
              <div className="font-bold group-hover:text-[#E8A020]">{gear.brand} {gear.model}</div>
              <div className="text-gray-500">{gear.category}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 relative">
        <Renderer 
          state={state} 
          zoom={zoom} 
          onSelectNode={(id) => setState(prev => ({ ...prev, selectedNodeId: id }))}
          onUpdateNode={handleUpdateNode}
        />

        {/* Console Overlay - Only shows when a console is selected */}
        {selectedNode && equipmentLibrary.find(e => e.id === selectedNode.defId)?.category === 'console' && (
          <div className="absolute bottom-0 left-0 right-0 h-1/2">
            <ProfessionalMixerConsole node={selectedNode} />
          </div>
        )}

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="w-8 h-8 rounded bg-black/60 border border-white/10">-</button>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-8 h-8 rounded bg-black/60 border border-white/10">+</button>
        </div>
      </div>
    </div>
  );
};

export default Lab;