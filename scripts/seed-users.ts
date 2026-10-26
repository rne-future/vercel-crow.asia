import "./load-env";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { userEntitlements, users } from "../lib/db/schema";
import { uuidv7 } from "../lib/db/uuid";

export async function upsertUser(email: string, name: string, role: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set({ name, role }).where(eq(users.id, existing[0].id));
    return existing[0].id;
  }
  const password = process.env.SEED_DEV_PASSWORD;
  if (!password) throw new Error("SEED_DEV_PASSWORD is required to create dev users.");
  const hash = await bcrypt.hash(password, 10);
  const inserted = await db
    .insert(users)
    .values({
      id: uuidv7(),
      email,
      name,
      password: hash,
      role,
      preferredLocale: "id",
      preferredIdRegister: "casual",
      emailVerified: new Date(),
    })
    .returning({ id: users.id });
  return inserted[0].id;
}

export async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed dev users in production.");
  }
  await upsertUser("admin@crow.asia", "Admin crow.asia", "admin");
  const harryId = await upsertUser("mharryrosyan@gmail.com", "Harry Rosyan", "reader");
  for (const bookId of ["book-1", "book-2", "book-3"]) {
    await db
      .insert(userEntitlements)
      .values({ id: uuidv7(), userId: harryId, bookId, orderId: null, isActive: true, grantedAt: new Date() })
      .onConflictDoNothing();
  }
  console.log("Dev users seeded (admin + harry; existing passwords preserved).");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(() => process.exit(0)).catch((err: unknown) => {
    console.error("Seed users FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
