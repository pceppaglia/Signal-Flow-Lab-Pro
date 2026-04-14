import React, { useState } from 'react';
import { Volume2, VolumeX, Zap, Settings, Activity } from 'lucide-react';

// Sub-component for individual channels
export const MixerStrip = ({ channel }: { channel: any }) => {
  const [volume, setVolume] = useState(channel.faderLevel || 75);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-t-lg w-20 py-4 select-none shadow-xl">
      {/* Input Section */}
      <div className="flex flex-col items-center mb-6 space-y-2 px-1 w-full">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Input</span>
        <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-orange-500/30 flex items-center justify-center hover:border-orange-500 cursor-pointer transition-colors">
          <Zap size={14} className="text-orange-500" />
        </div>
      </div>

      {/* Aux/Bus Section */}
      <div className="flex flex-col items-center space-y-3 mb-8 w-full">
        {channel.auxSends?.map((aux: any) => (
          <div key={aux.id} className="flex flex-col items-center group">
             <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer group-hover:border-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 group-hover:bg-cyan-400" />
             </div>
             <span className="text-[8px] text-zinc-600 font-mono mt-1 uppercase">Aux {aux.id}</span>
          </div>
        ))}
      </div>

      {/* Gain Reduction / Metering */}
      <div className="h-32 w-4 bg-black/40 rounded-sm mb-6 flex flex-col-reverse p-[1px] overflow-hidden border border-white/5">
        <div 
          className="w-full bg-gradient-to-t from-green-500 via-yellow-400 to-red-500 rounded-sm transition-all duration-75"
          style={{ height: isMuted ? '0%' : `${volume}%` }}
        />
      </div>

      {/* Fader Section */}
      <div className="flex flex-col items-center h-48 w-full px-2 relative">
        {/* Fader Track */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-black rounded-full" />
        
        {/* Vertical Range Input (The Fader) */}
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="appearance-none bg-transparent w-48 h-1 absolute top-24 -rotate-90 cursor-pointer accent-zinc-200"
        />
      </div>

      {/* Mute/Solo Buttons */}
      <div className="mt-4 flex flex-col space-y-2">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-10 h-6 rounded flex items-center justify-center text-[10px] font-bold border ${
            isMuted ? 'bg-red-900/40 border-red-500 text-red-500' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}
        >
          {isMuted ? <VolumeX size={12} /> : 'MUTE'}
        </button>
      </div>

      {/* Channel Label */}
      <div className="mt-6 w-full bg-zinc-950 border-t border-zinc-800 py-2">
        <div className="text-[11px] text-zinc-200 font-mono text-center truncate px-1">
          {channel.name || `CH ${channel.id}`}
        </div>
      </div>
    </div>
  );
};

// Main Console Component
export const ProfessionalMixerConsole: React.FC = () => {
  // Creating 8 dummy channels for the display
  const channels = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: i === 0 ? 'KICK' : i === 1 ? 'SNARE' : i === 2 ? 'VOCAL' : `INPUT ${i+1}`,
    auxSends: [{ id: 1, isPre: true }, { id: 2, isPre: false }]
  }));

  return (
    <div className="flex bg-zinc-950 p-6 rounded-xl border border-zinc-800 gap-1 shadow-2xl overflow-x-auto min-w-fit">
      {/* Input Channels */}
      <div className="flex gap-1 pr-6 border-r border-zinc-800/50">
        {channels.map((ch) => (
          <MixerStrip key={ch.id} channel={ch} />
        ))}
      </div>

      {/* Master Section */}
      <div className="flex flex-col items-center bg-zinc-900 border border-zinc-700 rounded-t-lg w-28 py-4 ml-4 shadow-2xl">
        <div className="flex flex-col items-center mb-6 space-y-2 px-1 w-full border-b border-zinc-800 pb-4">
          <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Master</span>
          <Activity size={18} className="text-zinc-600" />
        </div>

        {/* Master VU Meters */}
        <div className="flex gap-2 h-40 mb-8">
           <div className="w-2 h-full bg-black/60 rounded-full flex flex-col-reverse p-[1px]">
             <div className="w-full bg-cyan-500 rounded-full" style={{ height: '72%' }} />
           </div>
           <div className="w-2 h-full bg-black/60 rounded-full flex flex-col-reverse p-[1px]">
             <div className="w-full bg-cyan-500 rounded-full" style={{ height: '68%' }} />
           </div>
        </div>

        {/* Master Fader */}
        <div className="flex flex-col items-center h-48 w-full px-2 relative">
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-black rounded-full shadow-inner" />
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="80"
            className="appearance-none bg-transparent w-48 h-1 absolute top-24 -rotate-90 cursor-pointer accent-cyan-400"
          />
        </div>

        <div className="mt-8 px-4 w-full flex flex-col space-y-2">
            <button className="bg-zinc-800 border border-zinc-700 rounded py-1 px-2 text-[10px] text-zinc-400 flex items-center justify-center gap-1 hover:bg-zinc-700 transition-colors">
              <Settings size={10} /> BUS SETUP
            </button>
        </div>

        <div className="mt-auto w-full bg-cyan-950/20 border-t border-cyan-900/50 py-2">
          <div className="text-[11px] text-cyan-400 font-mono text-center font-bold tracking-tighter">
            MAIN LR
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalMixerConsole;