import React, { useMemo } from 'react';
import { EquipmentNode } from '../../../../shared/equipment-types';
import { equipmentLibrary } from '../lib/equipment-library';

interface ConsoleProps {
  node: EquipmentNode;
  onControlChange?: (channel: number, control: string, value: number) => void;
}

const ProfessionalMixerConsole: React.FC<ConsoleProps> = ({ node, onControlChange }) => {
  const def = useMemo(() => equipmentLibrary.find(e => e.id === node.defId), [node.defId]);
  
  if (!def) return null;

  // Determine console personality based on Model
  const isSovereign = def.id === 'sovereign-vr';
  const isVector = def.id === 'vector-4k';
  const isPearl = def.id === 'pearl-asp';
  
  const channelCount = def.inputs.length;
  const accentColor = isSovereign ? '#d91e1e' : isVector ? '#22a' : '#555';

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-gray-300 font-sans shadow-2xl rounded-t-lg overflow-hidden border-t border-white/10">
      {/* --- METER BRIDGE --- */}
      <div className="h-24 bg-[#0a0a0a] flex items-center px-4 gap-1 border-b border-black">
        {Array.from({ length: channelCount }).map((_, i) => (
          <div key={i} className="flex-1 h-16 bg-[#111] rounded-sm relative overflow-hidden flex flex-col justify-end p-0.5">
            <div className="w-full bg-green-500/40" style={{ height: '30%' }} />
            <div className="text-[8px] text-center text-gray-500 mt-1">{i + 1}</div>
          </div>
        ))}
        <div className="w-32 h-20 bg-[#111] rounded ml-4 border border-white/5 flex items-center justify-center">
          <div className="text-[#E8A020] font-mono text-xl">0.0</div>
        </div>
      </div>

      {/* --- MAIN CONTROL SURFACE --- */}
      <div className="flex flex-1 overflow-x-auto custom-scrollbar">
        {Array.from({ length: channelCount }).map((_, i) => (
          <div 
            key={i} 
            className={`flex-none w-16 border-r border-black/40 flex flex-col p-1 gap-4 
              ${i % 8 === 7 ? 'border-r-2 border-black' : ''}
              ${isSovereign ? 'bg-[#1f1f1f]' : 'bg-[#2a2a2a]'}`}
          >
            {/* Input Section */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full border-2 border-black shadow-inner flex items-center justify-center
                ${isSovereign ? 'bg-red-700' : 'bg-gray-700'}`}
              >
                <div className="w-1 h-3 bg-white/60 -mt-2 rotate-45" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-tighter">Gain</span>
            </div>

            {/* EQ Section */}
            <div className="flex flex-col gap-2 py-4 border-y border-black/20">
              <Knob color={isVector ? '#a22' : '#444'} size="sm" label="HF" />
              <Knob color={isVector ? '#2a2' : '#444'} size="sm" label="HMF" />
              <Knob color={isVector ? '#22a' : '#444'} size="sm" label="LMF" />
              <Knob color={isVector ? '#a82' : '#444'} size="sm" label="LF" />
            </div>

            {/* Aux/Routing Section */}
            <div className="flex flex-col gap-2 flex-1">
              <Knob color="#444" size="xs" label="Aux 1" />
              <Knob color="#444" size="xs" label="Aux 2" />
              <div className="mt-auto flex flex-col items-center gap-4 pb-8">
                <button className="w-4 h-4 rounded-sm bg-red-900 border border-black shadow-lg" />
                <div className="h-48 w-full relative flex justify-center">
                  <div className="absolute inset-y-0 w-1 bg-black/60 rounded-full" />
                  <div className="absolute top-1/4 w-10 h-6 bg-[#333] border border-black rounded shadow-xl flex items-center justify-center cursor-pointer hover:bg-[#444] transition-colors">
                    <div className="w-full h-0.5 bg-red-500" />
                  </div>
                </div>
                <div className="text-[10px] font-mono font-bold text-gray-500">{i + 1}</div>
              </div>
            </div>
          </div>
        ))}

        {/* --- MASTER SECTION --- */}
        <div className="flex-none w-64 bg-[#111] p-4 flex flex-col gap-8 border-l-4 border-black">
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border-4 border-[#E8A020] flex items-center justify-center shadow-2xl">
              <div className="text-[#E8A020] font-bold text-xs">TALK</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center">
              <div className="h-40 w-1 bg-black rounded-full relative flex justify-center">
                <div className="absolute top-1/2 w-12 h-8 bg-gray-200 rounded border border-gray-400 shadow-2xl" />
              </div>
              <span className="text-xs mt-12 font-bold">L-MIX</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-40 w-1 bg-black rounded-full relative flex justify-center">
                <div className="absolute top-1/2 w-12 h-8 bg-gray-200 rounded border border-gray-400 shadow-2xl" />
              </div>
              <span className="text-xs mt-12 font-bold">R-MIX</span>
            </div>
          </div>
          
          <div className="mt-auto text-center border-t border-white/5 pt-4">
            <div className="text-[#E8A020] font-bold text-lg tracking-widest">{def.brand.toUpperCase()}</div>
            <div className="text-gray-600 text-[10px] font-mono">{def.model}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal sub-component for reusable Knobs
const Knob: React.FC<{ color: string; size: 'xs' | 'sm' | 'md'; label: string }> = ({ color, size, label }) => {
  const diameter = size === 'xs' ? 'w-5 h-5' : size === 'sm' ? 'w-7 h-7' : 'w-10 h-10';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`${diameter} rounded-full border border-black shadow-lg relative flex items-center justify-center`} style={{ backgroundColor: color }}>
        <div className="absolute top-1 w-0.5 h-2 bg-white/40 rounded-full" />
      </div>
      <span className="text-[7px] uppercase font-bold text-gray-500">{label}</span>
    </div>
  );
};

export default ProfessionalMixerConsole;