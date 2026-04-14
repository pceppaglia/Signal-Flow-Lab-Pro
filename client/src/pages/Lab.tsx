import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
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
import {
 Home, Play, Square, ZoomIn, ZoomOut, Maximize2, Library, 
 Settings2, Volume2, VolumeX, Trash2, Power
} from 'lucide-react';

export default function Lab() {
 const params = useParams<{ scenarioId?: string }>();
 // Changed from Div to Canvas ref to support the renderer's forwardRef
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const ws = useWorkspace();

 // UI Panels
 const [showLibrary, setShowLibrary] = useState(true);
 const [showMixer, setShowMixer] = useState(true);
 const [audioRunning, setAudioRunning] = useState(false);
 const [audioMuted, setAudioMuted] = useState(true);

 // Mixer State
 const initialChannels = [
 { id: '1', name: 'Drums', faderLevel: 0, muted: true, inputLevel: -100, outputLevel: -100 },
 { id: '2', name: 'Bass', faderLevel: 0, muted: true, inputLevel: -100, outputLevel: -100 },
 { id: '3', name: 'Guitar L', faderLevel: 0, muted: true, inputLevel: -100, outputLevel: -100 },
 { id: '4', name: 'Guitar R', faderLevel: 0, muted: true, inputLevel: -100, outputLevel: -100 },
 { id: '5', name: 'Vocals', faderLevel: 0, muted: true, inputLevel: -100, outputLevel: -100 },
 ];

 const mixer = useMixerState(initialChannels as any, { masterL: 0, masterR: 0 } as any);

 // Audio Engine Hook
 useMixerAudioEngine(mixer.channels, mixer.master, mixer.updateChannel, mixer.updateMaster);

 // --- FIXED: High-Resolution Placement Logic ---
 const handleAddEquipment = useCallback((defId: string) => {
 if (!canvasRef.current) return;
 // Now uses the actual canvas element bounding box
 const rect = canvasRef.current.getBoundingClientRect();
 const centerX = (rect.width / 2 - ws.viewX) / ws.zoom;
 const centerY = (rect.height / 2 - ws.viewY) / ws.zoom;
 ws.addNode(defId, centerX, centerY);
 toast.success('Added to Rack');
 }, [ws.viewX, ws.viewY, ws.zoom, ws.addNode]);

 const toggleAudio = useCallback(async () => {
 if (audioRunning) {
 audioEngine.stop();
 setAudioRunning(false);
 } else {
 await audioEngine.start();
 setAudioRunning(true);
 audioEngine.setOutputGate(audioMuted ? 0 : 0.8);
 }
 }, [audioRunning, audioMuted]);

 return (
 <div className="h-screen w-screen flex flex-col bg-[#050505] text-[#F5F0E8] overflow-hidden">
 {/* TOP COMMAND BAR */}
 <header className="h-14 border-b border-[#222] bg-[#111] flex items-center px-6 gap-4 shrink-0 z-50">
 <div className="flex items-center gap-3">
 <Link href="/"><Home className="w-5 h-5 text-[#555] hover:text-white cursor-pointer" /></Link>
 <div className="w-px h-6 bg-[#222]" />
 <span className="text-lg font-bold tracking-tighter text-[#E8A020]" style={{ fontFamily: 'Bebas Neue' }}>
 SIGNAL FLOW LAB PRO <span className="text-[#444] text-xs ml-2">V2.1</span>
 </span>
 </div>
 <div className="flex-1" />

 {/* Audio Engine Dashboard */}
 <div className="flex items-center gap-2 bg-[#000] border border-[#222] rounded-full px-4 py-1.5">
 <button onClick={toggleAudio} className={`flex items-center gap-2 text-xs font-bold transition-all ${audioRunning ? 'text-green-400' : 'text-[#444] hover:text-white'}`}>
 <Power className="w-4 h-4" />
 {audioRunning ? 'ENGINE: ON' : 'ENGINE: OFF'}
 </button>
 <div className="w-px h-4 bg-[#222]" />
 <button onClick={() => setAudioMuted(!audioMuted)} className={audioMuted ? 'text-[#444]' : 'text-[#E8A020]'}>
 {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
 </button>
 </div>

 {/* View Controls */}
 <div className="flex items-center gap-4 text-xs font-bold text-[#A89F94]">
 <button onClick={() => setShowLibrary(!showLibrary)} className={`flex items-center gap-2 ${showLibrary ? 'text-[#E8A020]' : ''}`}>
 <Library className="w-4 h-4" /> GEAR
 </button>
 <button onClick={() => setShowMixer(!showMixer)} className={`flex items-center gap-2 ${showMixer ? 'text-[#E8A020]' : ''}`}>
 <Settings2 className="w-4 h-4" /> CONSOLE
 </button>
 </div>
 </header>

 {/* MAIN STUDIO SPACE */}
 <div className="flex-1 flex overflow-hidden">
 {/* LEFT RACK SELECTOR */}
 {showLibrary && (
 <aside className="w-72 border-r border-[#222] bg-[#0A0A0A] overflow-y-auto">
 <EquipmentLibraryPanel onAddEquipment={handleAddEquipment} />
 </aside>
 )}

 {/* CENTRAL WORKSPACE (Rack + Console) */}
 <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:32px_32px]">
 {/* THE RACK (Upper Half) */}
 <div 
 className="flex-1 relative cursor-crosshair"
 onWheel={(e) => { e.preventDefault(); ws.zoomView(e.deltaY > 0 ? -0.1 : 0.1, e.clientX, e.clientY); }}
 >
 <Canvas2DEquipmentRenderer
  ref={canvasRef}
  nodes={ws.nodes}
  cables={ws.cables}
  selectedNodeId={ws.selectedNodeId}
  viewX={ws.viewX}
  viewY={ws.viewY}
  zoom={ws.zoom}
  onNodeMouseDown={(e, id) => { ws.selectNode(id); ws.setDragState({ type: 'node', nodeId: id, offsetX: 0, offsetY: 0 }); }}
  onPortMouseDown={ws.handlePortMouseDown}
  onPortMouseUp={ws.handlePortMouseUp}
  onCableClick={ws.removeCable}
  onViewChange={ws.handleViewChange}
  dragState={ws.dragState}
  onDragStateChange={ws.setDragState}
 />

 {/* Viewport Status */}
 <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-[#111]/90 border border-[#222] px-4 py-2 rounded shadow-2xl">
 <div className="flex items-center gap-2 text-[10px] font-mono text-[#555]">
 <ZoomOut className="w-3 h-3" onClick={() => ws.zoomView(-0.2, 0, 0)} />
 {Math.round(ws.zoom * 100)}%
 <ZoomIn className="w-3 h-3" onClick={() => ws.zoomView(0.2, 0, 0)} />
 </div>
 <Maximize2 className="w-3 h-3 text-[#555] cursor-pointer" onClick={() => ws.panView(-ws.viewX, -ws.viewY)} />
 </div>
 </div>

 {/* THE CONSOLE (Lower Half - CENTERPIECE) */}
 {showMixer && (
 <div className="h-[450px] border-t-4 border-[#222] bg-[#1a1a1a] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-40 overflow-x-auto overflow-y-hidden flex">
 <div className="min-w-full p-6">
 <ProfessionalMixerConsole
 channels={mixer.channels}
 master={mixer.master}
 onChannelChange={mixer.updateChannel}
 onMasterChange={mixer.updateMaster}
 />
 </div>
 </div>
 )}
 </main>

 {/* RIGHT INSPECTOR (Contextual) */}
 {ws.selectedNode && (
 <aside className="w-80 border-l border-[#222] bg-[#111] p-6 animate-in slide-in-from-right duration-200">
 <div className="flex items