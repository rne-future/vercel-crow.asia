import "./load-env";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { userEntitlements, users } from "../lib/db/schema";
import { uuidv7 } from "../lib/db/uuid";

const PASSWORD = process.env.SEED_DEV_PASSWORD ?? "janganmasuk";

async function upsertUser(email: string, name: string, role: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const hash = await bcrypt.hash(PASSWORD, 10);
  if (existing.length > 0) {
    await db.update(users).set({ name, role, password: hash }).where(eq(users.id, existing[0].id));
    return existing[0].id;
  }
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

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed dev users in production.");
    process.exit(1);
  }
  await upsertUser("admin@crow.asia", "Admin crow.asia", "admin");
  const harryId = await upsertUser("mharryrosyan@gmail.com", "Harry Rosyan", "reader");
  for (const bookId of ["book-1", "book-2", "book-3"]) {
    await db
      .insert(userEntitlements)
      .values({ id: uuidv7(), userId: harryId, bookId, orderId: null, isActive: true, grantedAt: new Date() })
      .onConflictDoNothing();
  }
  console.log("Dev users seeded (admin + harry, password from SEED_DEV_PASSWORD or default).");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("Seed users FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
