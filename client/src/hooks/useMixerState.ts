import { useState, useCallback } from 'react';
import type { ChannelOutputDestination } from '@shared/mixer-types';

export interface ChannelState {
  id: string;
  name: string;
  inputGain: number;
  polarity: boolean;
  phantomPower: boolean;
  hpfEnabled: boolean;
  hpfFreq: number;
  compressorThreshold: number;
  compressorRatio: number;
  compressorAttack: number;
  compressorRelease: number;
  gateThreshold: number;
  eqHighShelf: { freq: number; gain: number; q: number };
  eqMidHigh: { freq: number; gain: number; q: number };
  eqMidLow: { freq: number; gain: number; q: number };
  eqLowShelf: { freq: number; gain: number; q: number };
  auxSends: Array<{ level: number; preFader: boolean }>;
  pan: number;
  faderLevel: number;
  muted: boolean;
  solo: boolean;
  /** Legacy: null = master, 0..3 = subgroup bus index. Prefer `outputDestination`. */
  routeToSubgroup: number | null;
  /** tRPC-aligned bus target (master or subgroup_id 0–3). */
  outputDestination?: ChannelOutputDestination;
  directOut: boolean;
  insertEnabled: boolean;
  inputLevel: number;
  outputLevel: number;
}

export interface MasterState {
  subgroups: Array<{ name: string; faderLevel: number; muted: boolean; solo: boolean }>;
  auxReturns: Array<{ level: number; name: string }>;
  soloMasterLevel: number;
  aflPfl: 'afl' | 'pfl';
  masterL: number;
  masterR: number;
}

interface UseMixerStateReturn {
  channels: ChannelState[];
  master: MasterState;
  updateChannel: (channelId: string, updates: Partial<ChannelState>) => void;
  updateMaster: (updates: Partial<MasterState>) => void;
  updateChannelFader: (channelId: string, level: number) => void;
  updateChannelPan: (channelId: string, pan: number) => void;
  updateChannelMute: (channelId: string, muted: boolean) => void;
  updateChannelSolo: (channelId: string, solo: boolean) => void;
  updateAuxSend: (channelId: string, auxIndex: number, level: number, preFader?: boolean) => void;
  updateMasterFader: (side: 'L' | 'R', level: number) => void;
  updateSubgroupFader: (index: number, level: number) => void;
  updateAuxReturn: (index: number, level: number) => void;
}

export function useMixerState(initialChannels: ChannelState[], initialMaster: MasterState): UseMixerStateReturn {
  const [channels, setChannels] = useState<ChannelState[]>(initialChannels);
  const [master, setMaster] = useState<MasterState>(initialMaster);

  const updateChannel = useCallback((channelId: string, updates: Partial<ChannelState>) => {
    setChannels(prev =>
      prev.map(ch => (ch.id === channelId ? { ...ch, ...updates } : ch))
    );
  }, []);

  const updateMaster = useCallback((updates: Partial<MasterState>) => {
    setMaster(prev => ({ ...prev, ...updates }));
  }, []);

  const updateChannelFader = useCallback((channelId: string, level: number) => {
    updateChannel(channelId, { faderLevel: Math.max(0, Math.min(1, level)) });
  }, [updateChannel]);

  const updateChannelPan = useCallback((channelId: string, pan: number) => {
    updateChannel(channelId, { pan: Math.max(-1, Math.min(1, pan)) });
  }, [updateChannel]);

  const updateChannelMute = useCallback((channelId: string, muted: boolean) => {
    updateChannel(channelId, { muted });
  }, [updateChannel]);

  const updateChannelSolo = useCallback((channelId: string, solo: boolean) => {
    updateChannel(channelId, { solo });
  }, [updateChannel]);

  const updateAuxSend = useCallback(
    (channelId: string, auxIndex: number, level: number, preFader = false) => {
      updateChannel(channelId, {
        auxSends: channels
          .find(ch => ch.id === channelId)
          ?.auxSends.map((send, idx) =>
            idx === auxIndex ? { level: Math.max(0, Math.min(1, level)), preFader } : send
          ) || [],
      });
    },
    [channels, updateChannel]
  );

  const updateMasterFader = useCallback((side: 'L' | 'R', level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    if (side === 'L') {
      updateMaster({ masterL: clamped });
    } else {
      updateMaster({ masterR: clamped });
    }
  }, [updateMaster]);

  const updateSubgroupFader = useCallback(
    (index: number, level: number) => {
      const clamped = Math.max(0, Math.min(1, level));
      updateMaster({
        subgroups: master.subgroups.map((sg, idx) =>
          idx === index ? { ...sg, faderLevel: clamped } : sg
        ),
      });
    },
    [master.subgroups, updateMaster]
  );

  const updateAuxReturn = useCallback(
    (index: number, level: number) => {
      const clamped = Math.max(0, Math.min(1, level));
      updateMaster({
        auxReturns: master.auxReturns.map((aux, idx) =>
          idx === index ? { ...aux, level: clamped } : aux
        ),
      });
    },
    [master.auxReturns, updateMaster]
  );

  return {
    channels,
    master,
    updateChannel,
    updateMaster,
    updateChannelFader,
    updateChannelPan,
    updateChannelMute,
    updateChannelSolo,
    updateAuxSend,
    updateMasterFader,
    updateSubgroupFader,
    updateAuxReturn,
  };
}
