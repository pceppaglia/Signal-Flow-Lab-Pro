import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getUserConfigurations, getConfigurationById, saveConfiguration,
  updateConfiguration, deleteConfiguration, getPublicConfigurations,
  getUserProgress, getProgressForScenario, upsertProgress,
  getConfigFeedback, addConfigFeedback,
} from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Configurations ──────────────────────────────────────────
  config: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserConfigurations(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getConfigurationById(input.id);
      }),

    save: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        data: z.any(),
        isPublic: z.number().optional(),
        scenarioId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return saveConfiguration({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          data: input.data,
          isPublic: input.isPublic,
          scenarioId: input.scenarioId,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        data: z.any().optional(),
        isPublic: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...rest } = input;
        await updateConfiguration(id, ctx.user.id, rest);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteConfiguration(input.id, ctx.user.id);
        return { success: true };
      }),

    publicList: publicProcedure.query(async () => {
      return getPublicConfigurations();
    }),
  }),

  // ─── Progress ────────────────────────────────────────────────
  progress: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserProgress(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ scenarioId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getProgressForScenario(ctx.user.id, input.scenarioId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        scenarioId: z.string(),
        completionPct: z.number().min(0).max(100),
        progressData: z.any().optional(),
        completedAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertProgress({
          userId: ctx.user.id,
          scenarioId: input.scenarioId,
          completionPct: input.completionPct,
          progressData: input.progressData,
          completedAt: input.completedAt,
        });
      }),
  }),

  // ─── Feedback ────────────────────────────────────────────────
  feedback: router({
    list: protectedProcedure
      .input(z.object({ configId: z.number() }))
      .query(async ({ input }) => {
        return getConfigFeedback(input.configId);
      }),

    add: protectedProcedure
      .input(z.object({
        configId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return addConfigFeedback({
          configId: input.configId,
          userId: ctx.user.id,
          comment: input.comment,
        });
      }),
  }),

  // ─── AI Assistant ────────────────────────────────────────────
  assistant: router({
    analyze: protectedProcedure
      .input(z.object({
        nodes: z.array(z.any()),
        cables: z.array(z.any()),
        question: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const nodesSummary = input.nodes.map((n: any) => ({
          defId: n.defId,
          settings: n.settings,
          signalLevels: n.signalLevels,
          isClipping: n.isClipping,
        }));

        const cablesSummary = input.cables.map((c: any) => ({
          from: `${c.fromNodeId}:${c.fromPortId}`,
          to: `${c.toNodeId}:${c.toPortId}`,
          signalType: c.signalType,
        }));

        const systemPrompt = `You are an expert audio engineer and educator. You analyze signal flow routing configurations and provide helpful, educational feedback. You know about:
- Signal levels: mic level (-60 to -20 dBu), line level (-10 to +4 dBu), speaker level (+20 to +40 dBu)
- Gain staging: proper gain structure to avoid clipping and maintain signal-to-noise ratio
- Equipment: SSL, Neve, API, UREI, Teletronix, Pultec, Lexicon, and other professional studio gear
- Routing: insert points, aux sends/returns, direct outputs, patch bays, monitor mixing
- Impedance matching, phantom power safety (never send +48V to ribbon mics), proper power-on sequences

Analyze the routing configuration provided and give specific, actionable feedback. Be encouraging but point out issues. Use technical terminology but explain it when needed. Keep responses concise (2-3 paragraphs max).`;

        const userMessage = input.question
          ? `Here is my current routing setup:\n\nNodes: ${JSON.stringify(nodesSummary, null, 2)}\n\nCables: ${JSON.stringify(cablesSummary, null, 2)}\n\nMy question: ${input.question}`
          : `Please analyze my current routing setup and provide feedback on signal flow, gain staging, and any potential issues:\n\nNodes: ${JSON.stringify(nodesSummary, null, 2)}\n\nCables: ${JSON.stringify(cablesSummary, null, 2)}`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          });

          const content = response.choices?.[0]?.message?.content || "I couldn't analyze the configuration. Please try again.";
          return { response: content };
        } catch (error) {
          console.error("[AI Assistant] LLM error:", error);
          return { response: "The AI assistant is temporarily unavailable. Please try again later." };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
