import React from 'react';
import { Headphones, VolumeX } from 'lucide-react';
import { cn } from '@rs/utils';
import { GlowBtn, HiFiKnob, LedMeter, LongThrowFader } from './mixer-primitives';

export interface SubgroupStripProps {
  label: string;
  fader: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  /** Stereo / main bus assign — feeds program L/R when true. */
  assignMain: boolean;
  eqHigh: number;
  eqLow: number;
  eqHighFreq: number;
  eqLowFreq: number;
  meterLevel: number;
  onFader: (v: number) => void;
  onPan: (v: number) => void;
  onMute: (v: boolean) => void;
  onSolo: (v: boolean) => void;
  onAssignMain: (v: boolean) => void;
  onEqHigh: (v: number) => void;
  onEqLow: (v: number) => void;
  onEqHighFreq: (v: number) => void;
  onEqLowFreq: (v: number) => void;
}

/**
 * Subgroup bus strip: post-channel-sum processing before master L/R.
 * DSP: shelving EQ → fader → pan → mute/solo → main assign.
 */
const SubgroupStrip: React.FC<SubgroupStripProps> = ({
  label,
  fader,
  pan,
  mute,
  solo,
  assignMain,
  eqHigh,
  eqLow,
  eqHighFreq,
  eqLowFreq,
  meterLevel,
  onFader,
  onPan,
  onMute,
  onSolo,
  onAssignMain,
  onEqHigh,
  onEqLow,
  onEqHighFreq,
  onEqLowFreq,
}) => {
  return (
    <div
      className={cn(
        'flex w-[92px] shrink-0 flex-col items-stretch gap-1 rounded-md border border-zinc-700/80',
        'bg-gradient-to-b from-zinc-950 via-[#0d0d0f] to-black p-1 shadow-inner'
      )}
    >
      <div className="text-center text-[7px] font-bold uppercase tracking-wide text-amber-200/75">
        Sub {label}
      </div>
      <div className="flex justify-center">
        <LedMeter level={meterLevel} className="h-14 max-w-[18px]" />
      </div>
      <div className="flex justify-center gap-0.5">
        <GlowBtn
          active={assignMain}
          ariaLabel="Assign to stereo main"
          className="h-6 min-w-[1.75rem] px-0.5 text-[6px]"
          onClick={() => onAssignMain(!assignMain)}
        >
          ST
        </GlowBtn>
      </div>
      <div className="flex flex-col items-center gap-0.5 border-t border-white/5 pt-1">
        <span className="text-[5px] font-bold uppercase text-zinc-600">Shelf EQ</span>
        <div className="flex w-full justify-between gap-0.5 px-0.5">
          <HiFiKnob
            compact
            label="HF"
            sublabel="dB"
            value={eqHigh}
            min={-18}
            max={18}
            tone="eq"
            unityAt={0}
            onChange={onEqHigh}
          />
          <HiFiKnob
            compact
            label="LF"
            sublabel="dB"
            value={eqLow}
            min={-18}
            max={18}
            tone="eq"
            unityAt={0}
            onChange={onEqLow}
          />
        </div>
        <div className="flex w-full justify-between gap-0.5 px-0.5">
          <HiFiKnob
            compact
            label="HF"
            sublabel="Hz"
            value={eqHighFreq}
            min={1500}
            max={16000}
            tone="eq"
            onChange={onEqHighFreq}
          />
          <HiFiKnob
            compact
            label="LF"
            sublabel="Hz"
            value={eqLowFreq}
            min={30}
            max={450}
            tone="eq"
            onChange={onEqLowFreq}
          />
        </div>
      </div>
      <div className="flex justify-center border-t border-white/5 pt-1">
        <HiFiKnob
          compact
          label="Pan"
          value={pan}
          min={-1}
          max={1}
          tone="neutral"
          unityAt={0}
          onChange={onPan}
        />
      </div>
      <div className="flex items-center justify-center gap-1">
        <GlowBtn
          active={mute}
          ariaLabel="Mute subgroup"
          className="h-7 w-7 p-0"
          onClick={() => onMute(!mute)}
        >
          <VolumeX className="h-3.5 w-3.5" strokeWidth={2.2} />
        </GlowBtn>
        <GlowBtn
          active={solo}
          ariaLabel="Solo subgroup"
          className="h-7 w-7 p-0"
          onClick={() => onSolo(!solo)}
        >
          <Headphones className="h-3.5 w-3.5" strokeWidth={2.2} />
        </GlowBtn>
      </div>
      <div className="flex flex-1 flex-col justify-end pt-0.5">
        <LongThrowFader
          value={fader}
          onChange={onFader}
          heightClass="h-28"
          travelPx={76}
        />
      </div>
    </div>
  );
};

export default SubgroupStrip;
