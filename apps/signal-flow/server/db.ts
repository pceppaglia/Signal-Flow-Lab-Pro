import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, configurations, userProgress, configFeedback } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Configuration Queries ───────────────────────────────────────

export async function getUserConfigurations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(configurations)
    .where(eq(configurations.userId, userId))
    .orderBy(desc(configurations.updatedAt));
}

export async function getConfigurationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(configurations).where(eq(configurations.id, id)).limit(1);
  return result[0];
}

export async function saveConfiguration(data: {
  userId: number;
  title: string;
  description?: string;
  data: unknown;
  isPublic?: number;
  scenarioId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(configurations).values({
    userId: data.userId,
    title: data.title,
    description: data.description ?? null,
    data: data.data,
    isPublic: data.isPublic ?? 0,
    scenarioId: data.scenarioId ?? null,
  });
  return { id: Number(result[0].insertId) };
}

export async function updateConfiguration(id: number, userId: number, data: {
  title?: string;
  description?: string;
  data?: unknown;
  isPublic?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.data !== undefined) updateSet.data = data.data;
  if (data.isPublic !== undefined) updateSet.isPublic = data.isPublic;
  await db.update(configurations).set(updateSet)
    .where(and(eq(configurations.id, id), eq(configurations.userId, userId)));
}

export async function deleteConfiguration(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(configurations)
    .where(and(eq(configurations.id, id), eq(configurations.userId, userId)));
}

export async function getPublicConfigurations() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: configurations.id,
    userId: configurations.userId,
    title: configurations.title,
    description: configurations.description,
    scenarioId: configurations.scenarioId,
    createdAt: configurations.createdAt,
    updatedAt: configurations.updatedAt,
  }).from(configurations)
    .where(eq(configurations.isPublic, 1))
    .orderBy(desc(configurations.updatedAt))
    .limit(50);
}

// ─── Progress Queries ────────────────────────────────────────────

export async function getUserProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userProgress)
    .where(eq(userProgress.userId, userId))
    .orderBy(desc(userProgress.updatedAt));
}

export async function getProgressForScenario(userId: number, scenarioId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.scenarioId, scenarioId)))
    .limit(1);
  return result[0];
}

export async function upsertProgress(data: {
  userId: number;
  scenarioId: string;
  completionPct: number;
  progressData?: unknown;
  completedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getProgressForScenario(data.userId, data.scenarioId);
  if (existing) {
    await db.update(userProgress).set({
      completionPct: data.completionPct,
      progressData: data.progressData ?? existing.progressData,
      completedAt: data.completedAt ?? existing.completedAt,
    }).where(eq(userProgress.id, existing.id));
    return { id: existing.id };
  } else {
    const result = await db.insert(userProgress).values({
      userId: data.userId,
      scenarioId: data.scenarioId,
      completionPct: data.completionPct,
      progressData: data.progressData ?? null,
      completedAt: data.completedAt ?? null,
    });
    return { id: Number(result[0].insertId) };
  }
}

// ─── Feedback Queries ────────────────────────────────────────────

export async function getConfigFeedback(configId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(configFeedback)
    .where(eq(configFeedback.configId, configId))
    .orderBy(desc(configFeedback.createdAt));
}

export async function addConfigFeedback(data: {
  configId: number;
  userId: number;
  comment: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(configFeedback).values(data);
  return { id: Number(result[0].insertId) };
}
