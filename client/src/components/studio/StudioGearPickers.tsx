import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  equipmentLibrary,
  getRackPickerTab,
  getStagePickerTab,
  isStagePickerItem,
  UI_RACK_TAB_LABELS,
  UI_RACK_TAB_ORDER,
  UI_STAGE_TAB_LABELS,
  UI_STAGE_TAB_ORDER,
  type EquipmentDef,
  type UiRackTab,
  type UiStageTab,
} from '@/lib/equipment-library';
import EquipmentMiniPreview from './EquipmentMiniPreview';
import { cn } from '@/lib/utils';

const DEF_MIME = 'application/signal-flow-def-id';

function GearRow({
  def,
  onPick,
}: {
  def: EquipmentDef;
  onPick: (defId: string) => void;
}) {
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            'flex w-full items-center gap-1 rounded-md border border-white/10 bg-black/35 py-1.5 pl-1 pr-2 text-left',
            'transition-colors hover:border-amber-500/40 hover:bg-amber-500/10'
          )}
        >
          <span
            draggable
            title="Drag to canvas"
            onDragStart={(e) => {
              e.dataTransfer.setData(DEF_MIME, def.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="flex shrink-0 cursor-grab select-none flex-col justify-center px-0.5 text-[10px] leading-none text-white/35 hover:text-white/55 active:cursor-grabbing"
            aria-hidden
          >
            ⋮
            <br />
            ⋮
          </span>
          <button
            type="button"
            onClick={() => onPick(def.id)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            <EquipmentMiniPreview def={def} className="shrink-0 rounded border border-white/10 bg-[#0d0d0d]" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white/90">
              {def.name}
            </span>
          </button>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" className="border-white/15 bg-neutral-950 text-white">
        <p className="text-xs font-bold text-amber-200/95">{def.name}</p>
        <p className="mt-1 text-[11px] leading-snug text-white/75">{def.description}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

interface StudioGearPickersProps {
  onPick: (defId: string) => void;
  stageButtonStyle?: React.CSSProperties;
  rackButtonStyle?: React.CSSProperties;
}

const StudioGearPickers: React.FC<StudioGearPickersProps> = ({
  onPick,
  stageButtonStyle,
  rackButtonStyle,
}) => {
  const rackByTab = UI_RACK_TAB_ORDER.reduce(
    (acc, tab) => {
      acc[tab] = equipmentLibrary.filter((d) => getRackPickerTab(d) === tab);
      return acc;
    },
    {} as Record<UiRackTab, EquipmentDef[]>
  );

  const stageByTab = UI_STAGE_TAB_ORDER.reduce(
    (acc, tab) => {
      acc[tab] = equipmentLibrary.filter((d) => getStagePickerTab(d) === tab);
      return acc;
    },
    {} as Record<UiStageTab, EquipmentDef[]>
  );

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            style={stageButtonStyle}
            className={cn(
              'group pointer-events-auto absolute z-40 -translate-x-1/2 -translate-y-1/2',
              'flex items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-1.5 py-1.5',
              'text-[10px] font-bold uppercase tracking-wide text-white/80 shadow-md backdrop-blur-sm',
              'opacity-55 transition-all hover:border-amber-400/45 hover:bg-amber-500/10 hover:opacity-100'
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm leading-none text-amber-200/95">
              +
            </span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-left text-[9px] font-bold leading-snug opacity-0 transition-all duration-200 group-hover:max-w-[11rem] group-hover:opacity-100">
              Add Sound Source
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="center"
          sideOffset={12}
          className="max-h-[min(70vh,520px)] w-[min(92vw,380px)] overflow-y-auto border-white/15 bg-neutral-950 p-3 text-white"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
            Sound sources
          </p>
          <Tabs defaultValue="microphones" className="w-full">
            <TabsList className="mb-2 h-auto w-full flex-wrap gap-1 bg-black/40 p-1">
              {UI_STAGE_TAB_ORDER.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="flex-1 text-[10px] data-[state=active]:bg-amber-600 data-[state=active]:text-black"
                >
                  {UI_STAGE_TAB_LABELS[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
            {UI_STAGE_TAB_ORDER.map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 space-y-1.5">
                {stageByTab[tab].length === 0 ? (
                  <p className="text-[11px] text-white/45">No items in this category.</p>
                ) : (
                  stageByTab[tab].map((def) => (
                    <GearRow key={def.id} def={def} onPick={onPick} />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            style={rackButtonStyle}
            className={cn(
              'group pointer-events-auto absolute z-40 -translate-x-1/2 -translate-y-1/2',
              'flex items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-1.5 py-1.5',
              'text-[10px] font-bold uppercase tracking-wide text-white/80 shadow-md backdrop-blur-sm',
              'opacity-55 transition-all hover:border-amber-400/45 hover:bg-amber-500/10 hover:opacity-100'
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm leading-none text-amber-200/95">
              +
            </span>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-left text-[9px] font-bold leading-snug opacity-0 transition-all duration-200 group-hover:max-w-[11rem] group-hover:opacity-100">
              Add Outboard Gear
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="center"
          sideOffset={12}
          className="max-h-[min(70vh,560px)] w-[min(92vw,400px)] overflow-y-auto border-white/15 bg-neutral-950 p-3 text-white"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
            Outboard rack
          </p>
          <Tabs defaultValue="preamps" className="w-full">
            <TabsList className="mb-2 grid h-auto w-full grid-cols-2 gap-1 bg-black/40 p-1 sm:grid-cols-3">
              {UI_RACK_TAB_ORDER.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="text-[9px] data-[state=active]:bg-amber-600 data-[state=active]:text-black"
                >
                  {UI_RACK_TAB_LABELS[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
            {UI_RACK_TAB_ORDER.map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 space-y-1.5">
                {rackByTab[tab].length === 0 ? (
                  <p className="text-[11px] text-white/45">No items in this category.</p>
                ) : (
                  rackByTab[tab].map((def) => (
                    <GearRow key={def.id} def={def} onPick={onPick} />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </PopoverContent>
      </Popover>
    </>
  );
};

export { DEF_MIME, isStagePickerItem };
export default StudioGearPickers;
