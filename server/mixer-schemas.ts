import { z } from "zod";

/** tRPC / API validation — mirrors `shared/mixer-types` ChannelOutputDestination. */
export const channelOutputDestinationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("master") }),
  z.object({
    type: z.literal("subgroup"),
    subgroup_id: z.number().int().min(0).max(3),
  }),
]);

export type ChannelOutputDestinationInput = z.infer<typeof channelOutputDestinationSchema>;
