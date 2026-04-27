// apps/the-lab-hub/server/routers.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./_core/context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  // Add any tRPC procedures specific to the hub here
});

export type AppRouter = typeof appRouter;
