import React, { useState } from 'react';
import { equipmentLibrary } from '@/lib/equipment-library';
import type { EquipmentCategory } from '../../../shared/equipment-types';
import { Search, Plus, Mic, SlidersHorizontal, Radio, Volume2, Headphones, Cable, Disc, HardDrive } from 'lucide-react';

interface Props {
  onAddEquipment: (defId: string) => void;
}

const categories: { id: EquipmentCategory; label: string; icon: React.ElementType }[] = [
  { id: 'source', label: 'Sources', icon: Radio },
  { id: 'microphone', label: 'Microphones', icon: Mic },
  { id: 'preamp', label: 'Preamps', icon: SlidersHorizontal },
  { id: 'compressor', label: 'Compressors', icon: Disc },
  { id: 'eq', label: 'Equalizers', icon: SlidersHorizontal },
  { id: 'effects', label: 'Effects', icon: Cable },
  { id: 'console', label: 'Console', icon: HardDrive },
  { id: 'patchbay', label: 'Patch Bay', icon: Cable },
  { id: 'amplifier', label: 'Amplifiers', icon: Volume2 },
  { id: 'monitor', label: 'Monitors', icon: Headphones },
  { id: 'recorder', label: 'Recording', icon: Disc },
];

export default function EquipmentLibraryPanel({ onAddEquipment }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | 'all'>('all');

  const filtered = equipmentLibrary.filter(eq => {
    const matchesSearch = search === '' ||
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.brand.toLowerCase().includes(search.toLowerCase()) ||
      eq.model.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || eq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-[#111] border-r border-[#222]">
      {/* Header */}
      <div className="p-3 border-b border-[#222]">
        <div className="text-sm font-bold tracking-wider mb-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
          EQUIPMENT LIBRARY
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gear..."
            className="w-full bg-[#1a1a1a] border border-[#333] text-[#F5F0E8] text-xs rounded pl-7 pr-2 py-1.5 focus:border-[#E8A020] outline-none placeholder:text-[#555]"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="p-2 border-b border-[#222] overflow-x-auto">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`text-[9px] font-bold tracking-wider px-2 py-1 rounded transition-colors ${
              selectedCategory === 'all' ? 'bg-[#E8A020] text-[#0D0D0D]' : 'bg-[#1a1a1a] text-[#A89F94] hover:bg-[#222]'
            }`}
          >
            ALL
          </button>
          {categories.map(cat => {
            const count = equipmentLibrary.filter(e => e.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[9px] font-bold tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                  selectedCategory === cat.id ? 'bg-[#E8A020] text-[#0D0D0D]' : 'bg-[#1a1a1a] text-[#A89F94] hover:bg-[#222]'
                }`}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(eq => (
          <div
            key={eq.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#141414] border border-[#1a1a1a] hover:border-[#E8A020]/30 transition-colors group cursor-pointer"
            onClick={() => onAddEquipment(eq.id)}
          >
            {/* Color indicator */}
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: eq.accentColor || '#E8A020' }} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#F5F0E8] truncate">{eq.brand} {eq.name}</span>
              </div>
              <div className="text-[9px] text-[#555] truncate">{eq.description.slice(0, 60)}...</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] text-[#A89F94]">{eq.inputs.length} in / {eq.outputs.length} out</span>
                {eq.hasPhantom && <span className="text-[7px] bg-[#E8A020]/20 text-[#E8A020] px-1 rounded">+48V</span>}
                {eq.hasInsert && <span className="text-[7px] bg-blue-900/30 text-blue-400 px-1 rounded">INSERT</span>}
              </div>
            </div>

            <button className="w-6 h-6 rounded bg-[#E8A020]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#E8A020]/20">
              <Plus className="w-3.5 h-3.5 text-[#E8A020]" />
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-[#555] text-xs">
            No equipment matches your search.
          </div>
        )}
      </div>
    </div>
  );
}
