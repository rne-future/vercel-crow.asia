import { z } from "zod";
import { entitlementsRepository } from "./entitlements.repository";
import { authService, isAdminRole, type SessionUser } from "@/lib/modules/auth/auth.service";
import { resourceIdSchema } from "@/lib/modules/books/books.schema";

export async function hasAccessToBook(userId: string | null, bookId: string) {
  return !!userId && entitlementsRepository.hasBook(userId, bookId);
}

export const entitlementsService = {
  hasAccessToBook,
  async canAccessBook(user: SessionUser | null, bookId: string) {
    return !!user && (isAdminRole(user.role) || await hasAccessToBook(user.id, bookId));
  },
  async accessSet(user: SessionUser | null) {
    if (!user) return new Set<string>();
    return new Set((await entitlementsRepository.listForUser(user.id)).filter((row) => row.isActive).map((row) => row.bookId));
  },
  async grantForAdmin(input: unknown) {
    await authService.requireAdmin();
    const parsed = z.object({ userId: z.uuid(), bookId: resourceIdSchema }).strict().parse(input);
    await entitlementsRepository.grant(parsed.userId, parsed.bookId, null, true);
  },
  async listForAdmin() { await authService.requireAdmin(); return entitlementsRepository.listAll(); },
};
