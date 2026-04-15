import React from 'react';
import type { EquipmentNode } from '../../../shared/equipment-types';
import type { EquipmentDef } from '@/lib/equipment-library';
import { getTheoryForEquipment } from '@/lib/equipment-theory';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SafetyWarnings from './SafetyWarnings';

type ControlDef = EquipmentDef['controls'][number];

type InspectorNode = EquipmentNode & {
  settings: Record<string, unknown>;
  signalLevels?: Record<string, number>;
};

interface Props {
  node: InspectorNode;
  def: EquipmentDef;
  onUpdateSetting: (key: string, value: number | boolean | string) => void;
  onRemove: () => void;
  allNodes?: InspectorNode[];
  allCables?: any[];
}

function KnobControl({ control, value, onChange }: { control: ControlDef; value: number; onChange: (v: number) => void }) {
  const min = control.min ?? 0;
  const max = control.max ?? 100;
  const normalized = (value - min) / (max - min);
  const angle = -135 + normalized * 270;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12 group">
        {/* Knob background */}
        <svg viewBox="0 0 48 48" className="w-full h-full">
          {/* Track arc */}
          <circle cx="24" cy="24" r="18" fill="none" stroke="#333" strokeWidth="3" strokeDasharray="85 28" strokeDashoffset="-14" strokeLinecap="round" />
          {/* Value arc */}
          <circle cx="24" cy="24" r="18" fill="none" stroke="#E8A020" strokeWidth="3"
            strokeDasharray={`${normalized * 85} ${113 - normalized * 85}`}
            strokeDashoffset="-14" strokeLinecap="round" opacity={0.8} />
          {/* Knob body */}
          <circle cx="24" cy="24" r="14" fill="#222" stroke="#444" strokeWidth="1" />
          {/* Pointer */}
          <line
            x1="24" y1="24"
            x2={24 + 10 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={24 + 10 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke="#F5F0E8" strokeWidth="2" strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx="24" cy="24" r="2" fill="#555" />
        </svg>
        {/* Invisible range input overlay */}
        <input
          type="range"
          min={min}
          max={max}
          step={control.step ?? 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title={`${control.label}: ${value}${control.unit || ''}`}
        />
      </div>
      <div className="text-[10px] text-[#A89F94] text-center leading-tight">{control.label}</div>
      <div className="text-[10px] text-[#E8A020] font-mono">{value}{control.unit || ''}</div>
    </div>
  );
}

function FaderControl({ control, value, onChange }: { control: ControlDef; value: number; onChange: (v: number) => void }) {
  const min = control.min ?? -96;
  const max = control.max ?? 10;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[10px] text-[#A89F94]">{control.label}</div>
      <div className="relative h-32 w-8 bg-[#0a0a0a] rounded-full flex items-center justify-center">
        <input
          type="range"
          min={min}
          max={max}
          step={control.step ?? 0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-28 appearance-none cursor-pointer"
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            WebkitAppearance: 'slider-vertical',
            width: '8px',
          }}
          title={`${control.label}: ${value}${control.unit || ''}`}
        />
      </div>
      <div className="text-[10px] text-[#E8A020] font-mono">{value}{control.unit || ''}</div>
    </div>
  );
}

function SwitchControl({ control, value, onChange }: { control: ControlDef; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-[#E8A020]' : 'bg-[#333]'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div className="text-[10px] text-[#A89F94] text-center">{control.label}</div>
      <div className={`text-[10px] font-bold ${value ? 'text-[#E8A020]' : 'text-[#555]'}`}>
        {value ? 'ON' : 'OFF'}
      </div>
    </div>
  );
}

function SelectControl({ control, value, onChange }: { control: ControlDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-[#A89F94]">{control.label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border border-[#333] text-[#F5F0E8] text-xs rounded px-2 py-1 focus:border-[#E8A020] outline-none"
      >
        {control.options?.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function InspectorPanel({ node, def, onUpdateSetting, onRemove, allNodes = [], allCables = [] }: Props) {
  const knobs = def.controls.filter(c => c.type === 'knob');
  const faders = def.controls.filter(c => c.type === 'fader');
  const switches = def.controls.filter(c => c.type === 'switch');
  const selects = def.controls.filter(c => c.type === 'select');
  const theory = getTheoryForEquipment(def);

  return (
    <div className="h-full flex flex-col bg-[#111] border-l border-[#222]">
      {/* Header */}
      <div className="p-3 border-b border-[#222] bg-[#141414]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: def.accentColor || '#E8A020' }} />
            <span className="text-xs font-bold text-[#A89F94] tracking-wider">{def.brand}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-[#555] hover:text-[#C0392B]">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: def.accentColor || '#E8A020' }}>
          {def.name}
        </div>
        <div className="text-[10px] text-[#555] mt-0.5">{def.model}</div>
      </div>

      {def.educationalTip && (
        <div className="px-3 py-3 border-b border-[#222] bg-[#10151e]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9fd0ff]">
            Engineer's Note
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#dbe8ff]">{def.educationalTip}</p>
        </div>
      )}

      {/* Pro knowledge first — theory */}
      <div className="px-3 py-3 border-b border-[#222] bg-[#0d0d0d]">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-[#E8A020]" />
          <span className="text-[10px] font-semibold text-[#E8A020] tracking-wider uppercase">
            Pro knowledge
          </span>
        </div>
        <div className="text-xs font-medium text-[#F5F0E8] mb-1.5 leading-snug">{theory.title}</div>
        <p className="text-[11px] text-[#A89F94] leading-relaxed font-medium">{theory.body}</p>
      </div>

      {/* Description */}
      <div className="px-3 py-2 border-b border-[#222]">
        <p className="text-[11px] text-[#A89F94] leading-relaxed">{def.description}</p>
      </div>

      {/* Safety Warnings */}
      {(allNodes.length > 0 || allCables.length > 0) && (
        <div className="px-3 pt-3 border-b border-[#222]">
          <div className="text-[10px] text-[#555] tracking-wider mb-2 font-bold">SAFETY CHECK</div>
          <SafetyWarnings nodes={allNodes} cables={allCables} />
        </div>
      )}

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Selects */}
        {selects.length > 0 && (
          <div className="space-y-2">
            {selects.map(c => (
              <div key={c.id}>
                <SelectControl
                  control={c}
                  value={String(node.settings[c.id] ?? c.default)}
                  onChange={(v) => onUpdateSetting(c.id, v)}
                />
                {c.tooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="mt-1 flex items-center gap-1 text-[9px] text-[#555] hover:text-[#E8A020]">
                        <Info className="w-3 h-3" /> Info
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[250px] text-xs bg-[#1a1a1a] border-[#333]">
                      {c.tooltip}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Switches */}
        {switches.length > 0 && (
          <div>
            <div className="text-[10px] text-[#555] tracking-wider mb-2 font-bold">SWITCHES</div>
            <div className="grid grid-cols-3 gap-3">
              {switches.map(c => (
                <div key={c.id}>
                  <SwitchControl
                    control={c}
                    value={Boolean(node.settings[c.id] ?? c.default)}
                    onChange={(v) => onUpdateSetting(c.id, v)}
                  />
                  {c.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="mt-1 mx-auto flex items-center gap-0.5 text-[8px] text-[#555] hover:text-[#E8A020]">
                          <Info className="w-2.5 h-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px] text-xs bg-[#1a1a1a] border-[#333]">
                        {c.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knobs */}
        {knobs.length > 0 && (
          <div>
            <div className="text-[10px] text-[#555] tracking-wider mb-2 font-bold">CONTROLS</div>
            <div className="grid grid-cols-3 gap-3">
              {knobs.map(c => (
                <div key={c.id}>
                  <KnobControl
                    control={c}
                    value={Number(node.settings[c.id] ?? c.default)}
                    onChange={(v) => onUpdateSetting(c.id, v)}
                  />
                  {c.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="mt-0.5 mx-auto flex items-center gap-0.5 text-[8px] text-[#555] hover:text-[#E8A020]">
                          <Info className="w-2.5 h-2.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[250px] text-xs bg-[#1a1a1a] border-[#333]">
                        {c.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faders */}
        {faders.length > 0 && (
          <div>
            <div className="text-[10px] text-[#555] tracking-wider mb-2 font-bold">FADERS</div>
            <div className="flex gap-4 justify-center">
              {faders.map(c => (
                <FaderControl
                  key={c.id}
                  control={c}
                  value={Number(node.settings[c.id] ?? c.default)}
                  onChange={(v) => onUpdateSetting(c.id, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Signal levels */}
        <div>
          <div className="text-[10px] text-[#555] tracking-wider mb-2 font-bold">SIGNAL LEVELS</div>
          <div className="space-y-1">
            {def.inputs.map(p => {
              const level = node.signalLevels[p.id] ?? -100;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: level > -100 ? '#4CAF50' : '#333' }} />
                  <span className="text-[10px] text-[#A89F94] flex-1">{p.label}</span>
                  <span className="text-[10px] font-mono text-[#E8A020]">{level > -100 ? `${level.toFixed(1)} dBu` : '—'}</span>
                </div>
              );
            })}
            {def.outputs.map(p => {
              const level = node.signalLevels[p.id] ?? -100;
              const isClipping = level > 24;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isClipping ? '#C0392B' : level > -100 ? '#E8A020' : '#333' }} />
                  <span className="text-[10px] text-[#A89F94] flex-1">{p.label}</span>
                  <span className={`text-[10px] font-mono ${isClipping ? 'text-[#C0392B]' : 'text-[#E8A020]'}`}>
                    {level > -100 ? `${level.toFixed(1)} dBu` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
