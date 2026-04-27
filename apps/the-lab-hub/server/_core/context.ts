// apps/the-lab-hub/server/_core/context.ts
import type { ExpressContext } from "@trpc/server/adapters/express";

export type TrpcContext = {
  // Add any shared context here if needed for the hub
};

export function createContext(opts: ExpressContext): TrpcContext {
  return {};
}
