import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { getEquipmentById } from '@/lib/equipment-library';
import type { EquipmentNode, Cable } from '../../../shared/equipment-types';

interface Props {
  nodes: EquipmentNode[];
  cables: Cable[];
}

interface Warning {
  id: string;
  level: 'error' | 'warning' | 'info';
  title: string;
  description: string;
}

export default function SafetyWarnings({ nodes, cables }: Props) {
  const warnings = useMemo(() => {
    const warns: Warning[] = [];

    // Check for phantom power issues
    nodes.forEach(node => {
      const def = getEquipmentById(node.defId);
      if (!def) return;

      // Check if this is a ribbon microphone with phantom power enabled
      if (def.category === 'microphone' && def.name.includes('Royer')) {
        const hasPhantom = node.settings.phantom === true || node.settings.phantom === 1;
        if (hasPhantom) {
          warns.push({
            id: `phantom-ribbon-${node.instanceId}`,
            level: 'error',
            title: 'Phantom Power on Ribbon Mic',
            description: `The ${def.name} is a ribbon microphone. Never enable phantom power (+48V) on ribbon mics—it can permanently damage the ribbon element. Disable phantom power immediately.`,
          });
        }
      }

      // Check for condenser mics without phantom power
      if (def.category === 'microphone' && (def.name.includes('Neumann') || def.name.includes('AKG'))) {
        const hasPhantom = node.settings.phantom === true || node.settings.phantom === 1;
        if (!hasPhantom) {
          warns.push({
            id: `phantom-condenser-${node.instanceId}`,
            level: 'warning',
            title: 'Phantom Power Recommended',
            description: `The ${def.name} is a condenser microphone. It requires phantom power (+48V) to operate. Enable phantom power in the inspector panel.`,
          });
        }
      }
    });

    // Check for impedance mismatches
    cables.forEach(cable => {
      const sourceNode = nodes.find(n => n.instanceId === cable.fromNodeId);
      const targetNode = nodes.find(n => n.instanceId === cable.toNodeId);

      if (!sourceNode || !targetNode) return;

      const sourceDef = getEquipmentById(sourceNode.defId);
      const targetDef = getEquipmentById(targetNode.defId);

      if (!sourceDef || !targetDef) return;

      // Check for speaker-level to mic-input connection
      if (cable.signalType === 'speaker' && targetDef.category === 'microphone') {
        warns.push({
          id: `impedance-${cable.id}`,
          level: 'error',
          title: 'Impedance Mismatch',
          description: `Connecting speaker-level output to a microphone input will cause damage. Use a speaker-to-line converter or patch bay to properly attenuate the signal.`,
        });
      }

      // Check for digital-to-analog mismatches
      if (cable.signalType === 'digital' && targetDef.category === 'microphone') {
        warns.push({
          id: `digital-${cable.id}`,
          level: 'error',
          title: 'Signal Type Mismatch',
          description: `Cannot connect digital signal directly to a microphone input. Use a digital-to-analog converter (DAC) or audio interface.`,
        });
      }
    });

    // Check for clipping in the signal chain
    nodes.forEach(node => {
      if (node.isClipping) {
        const def = getEquipmentById(node.defId);
        if (def) {
          warns.push({
            id: `clipping-${node.instanceId}`,
            level: 'warning',
            title: 'Signal Clipping Detected',
            description: `The ${def.brand} ${def.name} is clipping. Reduce the input gain or lower the output level of the previous stage to prevent distortion.`,
          });
        }
      }
    });

    return warns;
  }, [nodes, cables]);

  if (warnings.length === 0) {
    return (
      <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-300 font-bold">All systems nominal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {warnings.map(warn => (
        <div
          key={warn.id}
          className={`p-2.5 rounded-lg border ${
            warn.level === 'error'
              ? 'bg-red-900/20 border-red-700/30'
              : warn.level === 'warning'
              ? 'bg-amber-900/20 border-amber-700/30'
              : 'bg-blue-900/20 border-blue-700/30'
          }`}
        >
          <div className="flex items-start gap-2">
            {warn.level === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : warn.level === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className={`text-xs font-bold ${
                warn.level === 'error'
                  ? 'text-red-300'
                  : warn.level === 'warning'
                  ? 'text-amber-300'
                  : 'text-blue-300'
              }`}>
                {warn.title}
              </div>
              <div className="text-[10px] text-[#A89F94] mt-1">{warn.description}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
