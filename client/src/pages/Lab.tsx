import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'wouter';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getEquipmentById } from '@/lib/equipment-library';
import { audioEngine } from '@/lib/audio-engine-v2';
import Canvas2DEquipmentRenderer from '@/components/Canvas2DEquipmentRenderer';
import InspectorPanel from '@/components/InspectorPanel';
import EquipmentLibraryPanel from '@/components/EquipmentLibraryPanel';
import ProfessionalMixerConsole from '@/components/ProfessionalMixerConsole';
import { useMixerState } from '@/hooks/useMixerState';
import { useMixerAudioEngine } from '@/hooks/useMixerAudioEngine';
import { toast } from 'sonner';
import { Home, Library, Settings2, Trash2, Power } from 'lucide-react';

export default function Lab() {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const ws = useWorkspace();

 const [showLibrary, setShowLibrary] = useState(true);
 const [showMixer, setShowMixer] = useState(true);
 const [audioRunning, setAudioRunning] = useState(false);

 const initialChannels = [
  { id: '1', name: 'Drums', faderLevel: 0, muted: true },
  { id: '2', name: 'Bass', faderLevel: 0, muted: true },
  { id: '3', name: 'Guitar L', faderLevel: 0, muted: true },
  { id: '4', name: 'Vocals', faderLevel: 0, muted: true },
 ];
 const mixer = useMixerState(initialChannels as any, { masterL: 0, masterR: 0 } as any);
 useMixerAudioEngine(mixer.channels, mixer.master, mixer.updateChannel, mixer.updateMaster);

 // Add to Rack - with automatic slot assignment
 const handleAddEquipment = useCallback((defId: string) => {
    const yPos = ws.nodes.filter(n => getEquipmentById(n.defId)?.category !== 'microphone').length * 88;
    ws.addNode(defId, 100, yPos);
    toast.success('Mounted in Rack');
 }, [ws.nodes, ws.addNode]);

 // Dragging Bridge
 useEffect(() => {
    if (ws.dragState?.type === 'node' && ws.dragState.cursorX !== undefined) {
        ws.moveNode(ws.dragState.nodeId!, ws.dragState.cursorX, ws.dragState.cursorY!);
    }
 }, [ws.dragState, ws.moveNode]);

 return (
 <div className="h-screen w-screen flex flex-col bg-[#050505] text-[#F5F0E8] overflow-hidden">
  {/* STUDIO TOP BAR */}
  <header className="h-14 border-b border-[#222] bg-[#111] flex items-center px-6 gap-6 shrink-0 z-50 shadow-xl">
    <div className="flex items-center gap-3">
        <Link href="/"><Home className="w-5 h-5 text-[#555] hover:text-white cursor-pointer" /></Link>
        <span className="text-xl font-bold tracking-tighter text-[#E8A020]" style={{ fontFamily: 'Bebas Neue' }}>
            VIRTUAL ANALOG STUDIO <span className="text-[#444] text-xs">PRO</span>
        </span>
    </div>
    <div className="flex-1" />
    <button onClick={() => setAudioRunning(!audioRunning)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black ${audioRunning ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'}`}>
        <Power className="w-4 h-4" /> ENGINE {audioRunning ? 'ACTIVE' : 'STOPPED'}
    </button>
    <div className="flex items-center gap-4 border-l border-[#222] pl-6">
        <button onClick={() => setShowLibrary(!showLibrary)} className={`flex items-center gap-2 text-[10px] font-bold ${showLibrary ? 'text-[#E8A020]' : 'text-[#444]'}`}><Library className="w-4 h-4" /> GEAR RACK</button>
        <button onClick={() => setShowMixer(!showMixer)} className={`flex items-center gap-2 text-[10px] font-bold ${showMixer ? 'text-[#E8A020]' : 'text-[#444]'}`}><Settings2 className="w-4 h-4" /> CONSOLE</button>
    </div>
  </header>

  {/* WORKSPACE AREA */}
  <div className="flex-1 flex overflow-hidden">
    {showLibrary && (
    <aside className="w-72 border-r border-[#222] bg-[#0A0A0A] overflow-y-auto z-30">
        <EquipmentLibraryPanel onAddEquipment={handleAddEquipment} />
    </aside>
    )}

    <main className="flex-1 flex flex-col relative overflow-hidden bg-[#050505]">
        {/* PHYSICAL RACK SPACE */}
        <div className="flex-1 relative overflow-hidden" onMouseUp={() => ws.setDragState(null)}>
            <Canvas2DEquipmentRenderer
                ref={canvasRef}
                nodes={ws.nodes}
                cables={ws.cables}
                selectedNodeId={ws.selectedNodeId}
                viewX={ws.viewX}
                viewY={ws.viewY}
                zoom={ws.zoom}
                onNodeMouseDown={(e, id) => ws.setDragState({ type: 'node', nodeId: id })}
                onPortMouseDown={() => {}}
                onPortMouseUp={() => {}}
                onCableClick={ws.removeCable}
                onViewChange={(x, y, z) => {}}
                dragState={ws.dragState}
                onDragStateChange={ws.setDragState}
            />
        </div>

        {/* ANALOG CONSOLE - Fixed height at bottom */}
        {showMixer && (
        <div className="h-[420px] bg-[#1a1a1a] border-t-4 border-[#111] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-40 overflow-x-auto shrink-0">
            <ProfessionalMixerConsole
                channels={mixer.channels}
                master={mixer.master}
                onChannelChange={mixer.updateChannel}
                onMasterChange={mixer.updateMaster}
            />
        </div>
        )}
    </main>

    {/* DEVICE INSPECTOR */}
    {ws.selectedNode && (
    <aside className="w-80 border-l border-[#222] bg-[#111] p-6 shadow-2xl z-50">
        <div className="flex items-center justify-between mb-8 border-b border-[#222] pb-4">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-[#E8A020]">DEVICE INSPECTOR</h3>
            <Trash2 className="w-4 h-4 text-red-900 hover:text-red-500 cursor-pointer" onClick={() => ws.removeNode(ws.selectedNodeId!)} />
        </div>
        <InspectorPanel
            node={ws.selectedNode}
            def={getEquipmentById(ws.selectedNode.defId)!}
            onUpdateSetting={ws.updateNodeSetting}
            onRemove={() => ws.removeNode(ws.selectedNodeId!)}
        />
    </aside>
    )}
  </div>
 </div>
 );
}