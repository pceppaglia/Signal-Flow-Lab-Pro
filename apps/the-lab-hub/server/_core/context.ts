import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export type TrpcContext = {
  // Add any shared context here if needed for the hub
};

export function createContext(_opts: CreateExpressContextOptions): TrpcContext {
  return {};
}
