import { cache } from "react";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { authRepository } from "./auth.repository";
import { credentialsSchema, updateRoleSchema } from "./auth.schema";
import { ServiceError } from "@/lib/shared/errors";
import { resolveLoginSource } from "./login-source";

export type SessionUser = { id: string; role: string };
export const isAdminRole = (role?: string) => role === "admin" || role === "editor";

const sessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await (await import("@/lib/integrations/auth")).auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.id ? { id: user.id, role: user.role ?? "reader" } : null;
});
const getProfile = cache(async (id?: string) => {
  if (!id) return null;
  const row = await authRepository.getProfile(id);
  return row ? { ...row, name: row.name ?? row.email } : null;
});
async function requireAdmin() {
  const user = await sessionUser();
  if (!user || !isAdminRole(user.role)) redirect("/login");
  return user;
}

export const authService = {
  sessionUser, getProfile, requireAdmin,
  async verifyCredentials(raw: unknown, headers: Pick<Headers, "get">) {
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return null;
    if (!await authService.allowLoginAttempt(parsed.data.email, resolveLoginSource(headers))) throw new ServiceError(429, "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.", "rate_limited");
    const user = await authRepository.findByEmail(parsed.data.email);
    if (!user?.password || !await bcrypt.compare(parsed.data.password, user.password)) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
  async allowLoginAttempt(email: string, source: string) {
    if (!await authRepository.allowAttempt("login-ip", source, 100, 15)) return false;
    return authRepository.allowAttempt("login-pair", JSON.stringify([source, email.trim().toLowerCase()]), 10, 15);
  },
  allowCheckoutAttempt: (email: string) => authRepository.allowAttempt("checkout", email, 10, 15),
  async login(input: unknown) {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) throw new ServiceError(400, "Data login tidak valid.");
    await (await import("@/lib/integrations/auth")).signIn("credentials", { ...parsed.data, redirect: false });
  },
  async logout() { await (await import("@/lib/integrations/auth")).signOut({ redirect: false }); },
  async listUsersForAdmin() { await requireAdmin(); return authRepository.listUsers(); },
  async updateRole(input: unknown) {
    const actor = await requireAdmin();
    if (actor.role !== "admin") throw new ServiceError(403, "Only administrators may change roles");
    const parsed = updateRoleSchema.parse(input);
    await authRepository.updateRole(parsed.email, parsed.role);
  },
};
