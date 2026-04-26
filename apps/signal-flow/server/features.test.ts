import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  const configs: any[] = [];
  let configIdCounter = 1;
  const progressRecords: any[] = [];
  let progressIdCounter = 1;
  const feedbackRecords: any[] = [];
  let feedbackIdCounter = 1;

  return {
    getUserConfigurations: vi.fn(async (userId: number) =>
      configs.filter(c => c.userId === userId)
    ),
    getConfigurationById: vi.fn(async (id: number) =>
      configs.find(c => c.id === id)
    ),
    saveConfiguration: vi.fn(async (data: any) => {
      const id = configIdCounter++;
      configs.push({ id, ...data, createdAt: new Date(), updatedAt: new Date() });
      return { id };
    }),
    updateConfiguration: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = configs.findIndex(c => c.id === id && c.userId === userId);
      if (idx >= 0) Object.assign(configs[idx], data);
    }),
    deleteConfiguration: vi.fn(async (id: number, userId: number) => {
      const idx = configs.findIndex(c => c.id === id && c.userId === userId);
      if (idx >= 0) configs.splice(idx, 1);
    }),
    getPublicConfigurations: vi.fn(async () =>
      configs.filter(c => c.isPublic === 1)
    ),
    getUserProgress: vi.fn(async (userId: number) =>
      progressRecords.filter(p => p.userId === userId)
    ),
    getProgressForScenario: vi.fn(async (userId: number, scenarioId: string) =>
      progressRecords.find(p => p.userId === userId && p.scenarioId === scenarioId)
    ),
    upsertProgress: vi.fn(async (data: any) => {
      const existing = progressRecords.find(
        p => p.userId === data.userId && p.scenarioId === data.scenarioId
      );
      if (existing) {
        Object.assign(existing, data);
        return { id: existing.id };
      }
      const id = progressIdCounter++;
      progressRecords.push({ id, ...data });
      return { id };
    }),
    getConfigFeedback: vi.fn(async (configId: number) =>
      feedbackRecords.filter(f => f.configId === configId)
    ),
    addConfigFeedback: vi.fn(async (data: any) => {
      const id = feedbackIdCounter++;
      feedbackRecords.push({ id, ...data, createdAt: new Date() });
      return { id };
    }),
    // Re-export user functions that the router file may reference
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: "Your signal chain looks good! The SM57 into the Neve 1073 is a classic combination. Consider adding a compressor after the preamp for dynamic control.",
        },
      },
    ],
  })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("config router", () => {
  it("saves a configuration and retrieves it", async () => {
    const ctx = createAuthContext(10);
    const caller = appRouter.createCaller(ctx);

    const saveResult = await caller.config.save({
      title: "Test Routing Setup",
      description: "A basic vocal chain",
      data: {
        nodes: [
          { instanceId: "n1", defId: "sm57", x: 100, y: 100, settings: {} },
          { instanceId: "n2", defId: "neve-1073", x: 300, y: 100, settings: { gain: 40 } },
        ],
        cables: [
          { id: "c1", fromNodeId: "n1", fromPortId: "out", toNodeId: "n2", toPortId: "mic-in", signalType: "mic" },
        ],
      },
    });

    expect(saveResult).toHaveProperty("id");
    expect(typeof saveResult.id).toBe("number");
  });

  it("lists user configurations", async () => {
    const ctx = createAuthContext(10);
    const caller = appRouter.createCaller(ctx);

    const configs = await caller.config.list();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
    expect(configs[0].title).toBe("Test Routing Setup");
  });

  it("updates a configuration", async () => {
    const ctx = createAuthContext(11);
    const caller = appRouter.createCaller(ctx);

    const { id } = await caller.config.save({
      title: "Original Title",
      data: { nodes: [], cables: [] },
    });

    const result = await caller.config.update({
      id,
      title: "Updated Title",
      isPublic: 1,
    });

    expect(result).toEqual({ success: true });
  });

  it("deletes a configuration", async () => {
    const ctx = createAuthContext(12);
    const caller = appRouter.createCaller(ctx);

    const { id } = await caller.config.save({
      title: "To Delete",
      data: { nodes: [], cables: [] },
    });

    const result = await caller.config.delete({ id });
    expect(result).toEqual({ success: true });
  });

  it("lists public configurations without auth", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const publicConfigs = await caller.config.publicList();
    expect(Array.isArray(publicConfigs)).toBe(true);
  });

  it("rejects save without authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.config.save({
        title: "Should Fail",
        data: { nodes: [], cables: [] },
      })
    ).rejects.toThrow();
  });
});

describe("progress router", () => {
  it("upserts and retrieves scenario progress", async () => {
    const ctx = createAuthContext(20);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.progress.upsert({
      scenarioId: "basic-signal-path",
      completionPct: 50,
      progressData: { completedSteps: ["step1", "step2"] },
    });

    expect(result).toHaveProperty("id");

    const progress = await caller.progress.get({ scenarioId: "basic-signal-path" });
    expect(progress).toBeDefined();
    expect(progress?.completionPct).toBe(50);
  });

  it("lists all progress for a user", async () => {
    const ctx = createAuthContext(20);
    const caller = appRouter.createCaller(ctx);

    const progressList = await caller.progress.list();
    expect(Array.isArray(progressList)).toBe(true);
    expect(progressList.length).toBeGreaterThan(0);
  });

  it("updates existing progress on second upsert", async () => {
    const ctx = createAuthContext(21);
    const caller = appRouter.createCaller(ctx);

    await caller.progress.upsert({
      scenarioId: "gain-staging",
      completionPct: 25,
    });

    await caller.progress.upsert({
      scenarioId: "gain-staging",
      completionPct: 100,
      completedAt: new Date(),
    });

    const progress = await caller.progress.get({ scenarioId: "gain-staging" });
    expect(progress?.completionPct).toBe(100);
  });
});

describe("feedback router", () => {
  it("adds and retrieves feedback for a config", async () => {
    const ctx = createAuthContext(30);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.feedback.add({
      configId: 1,
      comment: "Great routing setup! Consider adding a de-esser before the compressor.",
    });

    expect(result).toHaveProperty("id");

    const feedbackList = await caller.feedback.list({ configId: 1 });
    expect(Array.isArray(feedbackList)).toBe(true);
    expect(feedbackList.length).toBeGreaterThan(0);
    expect(feedbackList[0].comment).toContain("de-esser");
  });
});

describe("assistant router", () => {
  it("analyzes a routing configuration and returns feedback", async () => {
    const ctx = createAuthContext(40);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assistant.analyze({
      nodes: [
        { instanceId: "n1", defId: "sm57", x: 100, y: 100, settings: {}, signalLevels: { out: -56 }, isClipping: false },
        { instanceId: "n2", defId: "neve-1073", x: 300, y: 100, settings: { gain: 40 }, signalLevels: { "line-out": 4 }, isClipping: false },
      ],
      cables: [
        { id: "c1", fromNodeId: "n1", fromPortId: "out", toNodeId: "n2", toPortId: "mic-in", signalType: "mic" },
      ],
      question: "Is my gain staging correct?",
    });

    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
  });

  it("analyzes without a specific question", async () => {
    const ctx = createAuthContext(41);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.assistant.analyze({
      nodes: [
        { instanceId: "n1", defId: "sm57", x: 100, y: 100, settings: {} },
      ],
      cables: [],
    });

    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
  });

  it("rejects analysis without authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.assistant.analyze({
        nodes: [],
        cables: [],
      })
    ).rejects.toThrow();
  });
});
