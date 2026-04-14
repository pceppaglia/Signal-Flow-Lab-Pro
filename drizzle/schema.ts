import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Saved routing configurations */
export const configurations = mysqlTable("configurations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  /** JSON blob: nodes, patches, settings */
  data: json("data").notNull(),
  /** Whether this config is shared publicly */
  isPublic: int("isPublic").default(0).notNull(),
  scenarioId: varchar("scenarioId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Configuration = typeof configurations.$inferSelect;
export type InsertConfiguration = typeof configurations.$inferInsert;

/** Learning scenario completion and progress */
export const userProgress = mysqlTable("userProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  scenarioId: varchar("scenarioId", { length: 64 }).notNull(),
  /** 0-100 completion percentage */
  completionPct: int("completionPct").default(0).notNull(),
  /** JSON blob: step completions, score, feedback */
  progressData: json("progressData"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProgress = typeof userProgress.$inferSelect;

/** Shared configuration feedback / comments */
export const configFeedback = mysqlTable("configFeedback", {
  id: int("id").autoincrement().primaryKey(),
  configId: int("configId").notNull(),
  userId: int("userId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConfigFeedback = typeof configFeedback.$inferSelect;
