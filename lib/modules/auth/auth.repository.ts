import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Connection } from "@/lib/db/types";

export const authRepository = {
  async findByEmail(email: string, connection: Connection = db) {
    return (await connection.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null;
  },
  async getProfile(userId: string) {
    const [row] = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    return row ?? null;
  },
  async createUser(values: typeof users.$inferInsert, connection: Connection = db) {
    return (await connection.insert(users).values(values).onConflictDoNothing({ target: users.email }).returning({ id: users.id }))[0] ?? null;
  },
  async listUsers() {
    return db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).limit(100);
  },
  async updateRole(email: string, role: string) {
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.email, email));
  },
  async allowAttempt(scope: "login" | "checkout", identifier: string, limit: number, minutes: number) {
    const key = `${scope}:${createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex")}`;
    const [row] = await db.execute<{ attempts: number }>(sql`
      INSERT INTO request_rate_limits (key, attempts, resets_at)
      VALUES (${key}, 1, NOW() + ${minutes} * INTERVAL '1 minute')
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN request_rate_limits.resets_at <= NOW() THEN 1 ELSE LEAST(request_rate_limits.attempts + 1, ${limit + 1}) END,
        resets_at = CASE WHEN request_rate_limits.resets_at <= NOW() THEN NOW() + ${minutes} * INTERVAL '1 minute' ELSE request_rate_limits.resets_at END
      RETURNING attempts
    `);
    return row.attempts <= limit;
  },
};
