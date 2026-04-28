import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@rs/ui';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2 } from 'lucide-react';

interface MonitorMix {
  id: string;
  name: string;
  performer: string;
  channelLevels: Record<string, number>; // channel ID -> level (0-1)
  masterLevel: number;
}

interface MonitorMixPanelProps {
  mixes: MonitorMix[];
  channelNames: string[];
  onMixCreate?: (name: string, performer: string) => void;
  onMixDelete?: (mixId: string) => void;
  onMixUpdate?: (mixId: string, changes: Partial<MonitorMix>) => void;
}

export default function MonitorMixPanel({
  mixes,
  channelNames,
  onMixCreate,
  onMixDelete,
  onMixUpdate,
}: MonitorMixPanelProps) {
  const [selectedMixId, setSelectedMixId] = useState<string | null>(mixes[0]?.id || null);
  const [newPerformer, setNewPerformer] = useState('');
  const [newMixName, setNewMixName] = useState('');

  const selectedMix = mixes.find((m) => m.id === selectedMixId);

  const handleCreateMix = () => {
    if (newMixName && newPerformer) {
      onMixCreate?.(newMixName, newPerformer);
      setNewMixName('');
      setNewPerformer('');
    }
  };

  const handleChannelLevelChange = (channelId: string, level: number) => {
    if (!selectedMix) return;
    const newLevels = { ...selectedMix.channelLevels, [channelId]: level };
    onMixUpdate?.(selectedMix.id, { channelLevels: newLevels });
  };

  const handleMasterLevelChange = (level: number) => {
    if (!selectedMix) return;
    onMixUpdate?.(selectedMix.id, { masterLevel: level });
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-black rounded-lg border border-amber-900">
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-amber-400 font-bold mb-4">MONITOR MIXES</h3>

        {/* Monitor mix selector */}
        <div className="space-y-2 mb-4">
          {mixes.map((mix) => (
            <button
              key={mix.id}
              onClick={() => setSelectedMixId(mix.id)}
              className={`w-full text-left p-2 rounded transition-colors ${
                selectedMixId === mix.id
                  ? 'bg-amber-600 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="font-semibold">{mix.name}</div>
              <div className="text-xs">{mix.performer}</div>
            </button>
          ))}
        </div>

        {/* Create new mix */}
        <Card className="p-3 bg-gray-900 border-gray-700 mb-4">
          <h4 className="text-sm font-semibold text-amber-400 mb-2">New Monitor Mix</h4>
          <input
            type="text"
            placeholder="Mix name"
            value={newMixName}
            onChange={(e) => setNewMixName(e.target.value)}
            className="w-full px-2 py-1 mb-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
          <input
            type="text"
            placeholder="Performer name"
            value={newPerformer}
            onChange={(e) => setNewPerformer(e.target.value)}
            className="w-full px-2 py-1 mb-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
          <Button
            onClick={handleCreateMix}
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
        </Card>

        {/* Channel level controls */}
        {selectedMix && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-amber-400">Channel Levels</h4>

            {channelNames.map((channelName, index) => {
              const level = selectedMix.channelLevels[channelName] || 0;
              return (
                <div key={channelName} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{channelName}</span>
                    <span className="text-amber-400 font-mono">
                      {Math.round(level * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[level]}
                    onValueChange={(value) =>
                      handleChannelLevelChange(channelName, value[0])
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              );
            })}

            {/* Master level */}
            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-amber-400 font-semibold">MASTER</span>
                <span className="text-amber-400 font-mono">
                  {Math.round(selectedMix.masterLevel * 100)}%
                </span>
              </div>
              <Slider
                value={[selectedMix.masterLevel]}
                onValueChange={(value) => handleMasterLevelChange(value[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Delete button */}
            <Button
              onClick={() => onMixDelete?.(selectedMix.id)}
              variant="destructive"
              size="sm"
              className="w-full mt-4"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete Mix
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
