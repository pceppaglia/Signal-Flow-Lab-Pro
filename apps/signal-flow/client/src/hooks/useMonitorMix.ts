import { useState, useCallback } from 'react';

export interface MonitorMix {
  id: string;
  name: string;
  performer: string;
  channelLevels: Record<string, number>;
  masterLevel: number;
}

export function useMonitorMix(initialChannelNames: string[]) {
  const [mixes, setMixes] = useState<MonitorMix[]>([
    {
      id: 'mix1',
      name: 'Main Mix',
      performer: 'Drummer',
      channelLevels: Object.fromEntries(initialChannelNames.map((_, i) => [String(i + 1), 0.5])),
      masterLevel: 0.8,
    },
  ]);

  const createMix = useCallback((name: string, performer: string) => {
    const newMix: MonitorMix = {
      id: `mix-${Date.now()}`,
      name,
      performer,
      channelLevels: Object.fromEntries(initialChannelNames.map((_, i) => [String(i + 1), 0.5])),
      masterLevel: 0.8,
    };
    setMixes(prev => [...prev, newMix]);
    return newMix;
  }, [initialChannelNames]);

  const deleteMix = useCallback((mixId: string) => {
    setMixes(prev => prev.filter(m => m.id !== mixId));
  }, []);

  const updateMix = useCallback((mixId: string, changes: Partial<MonitorMix>) => {
    setMixes(prev =>
      prev.map(m => (m.id === mixId ? { ...m, ...changes } : m))
    );
  }, []);

  const updateChannelLevel = useCallback((mixId: string, channelId: string, level: number) => {
    setMixes(prev =>
      prev.map(m =>
        m.id === mixId
          ? { ...m, channelLevels: { ...m.channelLevels, [channelId]: level } }
          : m
      )
    );
  }, []);

  const updateMasterLevel = useCallback((mixId: string, level: number) => {
    setMixes(prev =>
      prev.map(m => (m.id === mixId ? { ...m, masterLevel: level } : m))
    );
  }, []);

  return {
    mixes,
    createMix,
    deleteMix,
    updateMix,
    updateChannelLevel,
    updateMasterLevel,
  };
}
