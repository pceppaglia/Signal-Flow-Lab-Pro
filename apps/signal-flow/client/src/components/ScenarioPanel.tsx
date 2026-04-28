import React from 'react';
import type { ScenarioDef } from '@/lib/scenarios';
import { CheckCircle2, Circle, Lightbulb, ChevronRight } from 'lucide-react';
import { Button } from '@rs/ui';

interface Props {
  scenario: ScenarioDef;
  completedObjectives: Set<string>;
  showHint: string | null;
  onToggleHint: (objectiveId: string) => void;
  onClose: () => void;
}

export default function ScenarioPanel({ scenario, completedObjectives, showHint, onToggleHint, onClose }: Props) {
  const completionPct = Math.round((completedObjectives.size / scenario.objectives.length) * 100);
  const allComplete = completedObjectives.size === scenario.objectives.length;

  return (
    <div className="h-full flex flex-col bg-[#111] border-l border-[#222]">
      {/* Header */}
      <div className="p-3 border-b border-[#222] bg-[#141414]">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded ${
            scenario.difficulty === 'beginner' ? 'bg-green-900/40 text-green-400' :
            scenario.difficulty === 'intermediate' ? 'bg-yellow-900/40 text-yellow-400' :
            'bg-red-900/40 text-red-400'
          }`}>
            {scenario.difficulty.toUpperCase()}
          </span>
          <span className="text-[9px] text-[#555] tracking-wider">{scenario.category}</span>
        </div>
        <div className="text-lg font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
          {scenario.title}
        </div>
        <p className="text-[11px] text-[#A89F94] mt-1 leading-relaxed">{scenario.description}</p>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-2 border-b border-[#222]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#A89F94]">Progress</span>
          <span className="text-[10px] font-mono text-[#E8A020]">{completionPct}%</span>
        </div>
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completionPct}%`,
              backgroundColor: allComplete ? '#4CAF50' : '#E8A020',
            }}
          />
        </div>
      </div>

      {/* Objectives */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[10px] text-[#555] tracking-wider font-bold mb-2">OBJECTIVES</div>
        {scenario.objectives.map((obj, i) => {
          const isComplete = completedObjectives.has(obj.id);
          const isShowingHint = showHint === obj.id;

          return (
            <div key={obj.id} className={`rounded-lg border p-2.5 transition-colors ${
              isComplete ? 'border-green-800/50 bg-green-900/10' : 'border-[#222] bg-[#141414]'
            }`}>
              <div className="flex items-start gap-2">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[#555] mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`text-[11px] leading-relaxed ${isComplete ? 'text-green-400 line-through' : 'text-[#F5F0E8]'}`}>
                    <span className="text-[#555] mr-1">{i + 1}.</span>
                    {obj.description}
                  </div>
                  {!isComplete && (
                    <button
                      onClick={() => onToggleHint(obj.id)}
                      className="mt-1 flex items-center gap-1 text-[9px] text-[#E8A020] hover:text-[#d4911c]"
                    >
                      <Lightbulb className="w-3 h-3" />
                      {isShowingHint ? 'Hide Hint' : 'Show Hint'}
                    </button>
                  )}
                  {isShowingHint && (
                    <div className="mt-1.5 p-2 bg-[#E8A020]/10 border border-[#E8A020]/20 rounded text-[10px] text-[#E8A020] leading-relaxed">
                      {obj.hint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {allComplete && (
        <div className="p-3 border-t border-green-800/50 bg-green-900/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-green-400 tracking-wider">SCENARIO COMPLETE!</span>
          </div>
          <p className="text-[11px] text-green-300/80 leading-relaxed">{scenario.completionMessage}</p>
          <Button onClick={onClose} className="mt-3 w-full bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] text-xs font-bold tracking-wider">
            BACK TO SCENARIOS <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {/* General hints */}
      {!allComplete && scenario.hints.length > 0 && (
        <div className="p-3 border-t border-[#222] bg-[#0D0D0D]">
          <div className="text-[10px] text-[#555] tracking-wider font-bold mb-1">TIPS</div>
          {scenario.hints.map((hint, i) => (
            <div key={i} className="flex items-start gap-1.5 mt-1">
              <ChevronRight className="w-3 h-3 text-[#E8A020] mt-0.5 shrink-0" />
              <span className="text-[10px] text-[#A89F94] leading-relaxed">{hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
