import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Sliders, Zap, Radio } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChannelStrip {
  id: string;
  name: string;
  input: number;
  gain: number;
  pan: number;
  fader: number;
  mute: boolean;
  solo: boolean;
  auxSends: Record<string, number>;
  directOut: number;
  insertActive: boolean;
  peakLevel: number;
  rmsLevel: number;
}

interface MixerState {
  channels: ChannelStrip[];
  masterLevel: number;
  masterPan: number;
  auxReturns: Record<string, number>;
  subgroupRouting: Record<string, string>;
  clipping: boolean;
}

interface ConfigurableMixerProps {
  channelCount?: 8 | 16 | 32;
  onStateChange?: (state: MixerState) => void;
}

export const ConfigurableMixer: React.FC<ConfigurableMixerProps> = ({
  channelCount = 8,
  onStateChange,
}) => {
  const [state, setState] = useState<MixerState>(() => {
    const channels: ChannelStrip[] = Array.from({ length: channelCount }, (_, i) => ({
      id: `ch${i + 1}`,
      name: `Channel ${i + 1}`,
      input: -100,
      gain: 0,
      pan: 0,
      fader: -6,
      mute: false,
      solo: false,
      auxSends: { aux1: 0, aux2: 0, aux3: 0, aux4: 0 },
      directOut: -100,
      insertActive: false,
      peakLevel: 0,
      rmsLevel: 0,
    }));

    return {
      channels,
      masterLevel: -6,
      masterPan: 0,
      auxReturns: { aux1: -12, aux2: -12, aux3: -12, aux4: -12 },
      subgroupRouting: {},
      clipping: false,
    };
  });

  const [selectedChannel, setSelectedChannel] = useState<string | null>(state.channels[0]?.id || null);
  const [viewMode, setViewMode] = useState<'channels' | 'master' | 'aux'>('channels');

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const updateChannel = (channelId: string, updates: Partial<ChannelStrip>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.id === channelId ? { ...ch, ...updates } : ch
      ),
    }));
  };

  const updateAuxReturn = (auxId: string, level: number) => {
    setState(prev => ({
      ...prev,
      auxReturns: { ...prev.auxReturns, [auxId]: level },
    }));
  };

  const selectedCh = state.channels.find(ch => ch.id === selectedChannel);

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-lg p-4 overflow-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-white">
              {channelCount}-Channel Mixer
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === 'channels' ? 'default' : 'outline'}
              onClick={() => setViewMode('channels')}
              className="text-xs"
            >
              Channels
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'master' ? 'default' : 'outline'}
              onClick={() => setViewMode('master')}
              className="text-xs"
            >
              Master
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'aux' ? 'default' : 'outline'}
              onClick={() => setViewMode('aux')}
              className="text-xs"
            >
              Aux
            </Button>
          </div>
        </div>

        {/* Channels View */}
        {viewMode === 'channels' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {state.channels.map(ch => (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`p-2 rounded border-2 cursor-pointer transition ${
                    selectedChannel === ch.id
                      ? 'border-amber-500 bg-slate-800'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-semibold text-white mb-2 truncate">
                    {ch.name}
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <div>Gain: {ch.gain.toFixed(1)}dB</div>
                    <div>Fader: {ch.fader.toFixed(1)}dB</div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateChannel(ch.id, { mute: !ch.mute });
                        }}
                        className={`flex-1 py-1 rounded text-xs font-bold ${
                          ch.mute
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateChannel(ch.id, { solo: !ch.solo });
                        }}
                        className={`flex-1 py-1 rounded text-xs font-bold ${
                          ch.solo
                            ? 'bg-yellow-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        S
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Channel Controls */}
            {selectedCh && (
              <Card className="p-4 bg-slate-800 border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4">{selectedCh.name} Controls</h3>
                <div className="space-y-4">
                  {/* Input Gain */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Input Gain</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[selectedCh.gain]}
                        onValueChange={([v]) => updateChannel(selectedCh.id, { gain: v })}
                        min={-12}
                        max={12}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-xs text-amber-400 w-12 text-right">
                        {selectedCh.gain.toFixed(1)}dB
                      </span>
                    </div>
                  </div>

                  {/* Fader */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Fader</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[selectedCh.fader]}
                        onValueChange={([v]) => updateChannel(selectedCh.id, { fader: v })}
                        min={-60}
                        max={6}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-xs text-amber-400 w-12 text-right">
                        {selectedCh.fader.toFixed(1)}dB
                      </span>
                    </div>
                  </div>

                  {/* Pan */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Pan</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[selectedCh.pan]}
                        onValueChange={([v]) => updateChannel(selectedCh.id, { pan: v })}
                        min={-100}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-amber-400 w-12 text-right">
                        {selectedCh.pan > 0 ? 'R' : selectedCh.pan < 0 ? 'L' : 'C'}
                        {Math.abs(selectedCh.pan).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Aux Sends */}
                  <div className="border-t border-slate-700 pt-3">
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Aux Sends
                    </label>
                    <div className="space-y-2">
                      {Object.entries(selectedCh.auxSends).map(([auxId, level]) => (
                        <div key={auxId} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-12">{auxId}</span>
                          <Slider
                            value={[level]}
                            onValueChange={([v]) =>
                              updateChannel(selectedCh.id, {
                                auxSends: { ...selectedCh.auxSends, [auxId]: v },
                              })
                            }
                            min={-60}
                            max={0}
                            step={0.1}
                            className="flex-1"
                          />
                          <span className="text-xs text-amber-400 w-10 text-right">
                            {level.toFixed(1)}dB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct Out */}
                  <div className="border-t border-slate-700 pt-3">
                    <label className="text-xs font-semibold text-slate-300">Direct Out</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[selectedCh.directOut]}
                        onValueChange={([v]) => updateChannel(selectedCh.id, { directOut: v })}
                        min={-60}
                        max={0}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-xs text-amber-400 w-12 text-right">
                        {selectedCh.directOut.toFixed(1)}dB
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Master View */}
        {viewMode === 'master' && (
          <Card className="p-4 bg-slate-800 border-slate-700">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-500" />
              Master Section
            </h3>
            <div className="space-y-4">
              {/* Master Level */}
              <div>
                <label className="text-xs font-semibold text-slate-300">Master Level</label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[state.masterLevel]}
                    onValueChange={([v]) => setState(prev => ({ ...prev, masterLevel: v }))}
                    min={-60}
                    max={6}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs text-amber-400 w-12 text-right">
                    {state.masterLevel.toFixed(1)}dB
                  </span>
                </div>
              </div>

              {/* Master Pan */}
              <div>
                <label className="text-xs font-semibold text-slate-300">Master Pan</label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[state.masterPan]}
                    onValueChange={([v]) => setState(prev => ({ ...prev, masterPan: v }))}
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-amber-400 w-12 text-right">
                    {state.masterPan > 0 ? 'R' : state.masterPan < 0 ? 'L' : 'C'}
                    {Math.abs(state.masterPan).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Clipping Indicator */}
              <div className="flex items-center gap-2 p-2 rounded bg-slate-700">
                <div
                  className={`w-3 h-3 rounded-full ${
                    state.clipping ? 'bg-red-500 animate-pulse' : 'bg-green-500'
                  }`}
                />
                <span className="text-xs text-slate-300">
                  {state.clipping ? 'CLIPPING' : 'No Clipping'}
                </span>
              </div>

              {/* Subgroup Routing Info */}
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400">
                  Subgroups: {Object.keys(state.subgroupRouting).length || 'None configured'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Aux View */}
        {viewMode === 'aux' && (
          <Card className="p-4 bg-slate-800 border-slate-700">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-500" />
              Auxiliary Returns
            </h3>
            <div className="space-y-4">
              {Object.entries(state.auxReturns).map(([auxId, level]) => (
                <div key={auxId}>
                  <label className="text-xs font-semibold text-slate-300 capitalize">
                    {auxId} Return
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[level]}
                      onValueChange={([v]) => updateAuxReturn(auxId, v)}
                      min={-60}
                      max={6}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-xs text-amber-400 w-12 text-right">
                      {level.toFixed(1)}dB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ConfigurableMixer;
