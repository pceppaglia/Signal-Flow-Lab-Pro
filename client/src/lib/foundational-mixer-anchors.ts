import type { EquipmentNode } from '../../../shared/equipment-types';

export const FOUNDATIONAL_MIXER_NODE_PREFIX = 'foundational-mixer-ch-';

export function createFoundationalMixerAnchorNodes(): EquipmentNode[] {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `${FOUNDATIONAL_MIXER_NODE_PREFIX}${i + 1}`,
    defId: 'foundational-mixer-channel',
    x: 460 + (i % 12) * 40,
    y: 72 + Math.floor(i / 12) * 44,
    rotation: 0,
    state: {},
  }));
}

export function isFoundationalMixerNodeId(id: string): boolean {
  return id.startsWith(FOUNDATIONAL_MIXER_NODE_PREFIX);
}
