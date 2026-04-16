/**
 * Signal Flow Lab — mixer routing types (shared client/server).
 * Maps to foundational mixer subgroup indices 0..3 (buses 1–2, 3–4, 5–6, 7–8).
 */

export type MixerSubgroupId = 0 | 1 | 2 | 3;

/** Channel output bus: stereo master or a subgroup bus (pre-master). */
export type ChannelOutputDestination =
  | { type: 'master' }
  | { type: 'subgroup'; subgroup_id: MixerSubgroupId };

export function mixerRouteToDestination(route: string): ChannelOutputDestination {
  switch (route) {
    case 'sub12':
      return { type: 'subgroup', subgroup_id: 0 };
    case 'sub34':
      return { type: 'subgroup', subgroup_id: 1 };
    case 'sub56':
      return { type: 'subgroup', subgroup_id: 2 };
    case 'sub78':
      return { type: 'subgroup', subgroup_id: 3 };
    default:
      return { type: 'master' };
  }
}

export function destinationToMixerRoute(dest: ChannelOutputDestination): string {
  if (dest.type === 'master') return 'master';
  const m: Record<MixerSubgroupId, string> = {
    0: 'sub12',
    1: 'sub34',
    2: 'sub56',
    3: 'sub78',
  };
  return m[dest.subgroup_id] ?? 'master';
}
