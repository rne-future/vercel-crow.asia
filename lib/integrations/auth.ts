import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, authSessions, users, verificationTokens } from "@/lib/db/schema";
import { authService } from "@/lib/modules/auth/auth.service";
import { authorizeCredentials } from "./auth-credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "reader";
      } else if (token.id) {
        const row = await authService.getProfile(String(token.id));
        token.role = row?.role ?? "reader";
        if (!row) delete token.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const u = session.user as unknown as Record<string, unknown>;
      u.id = token.id;
      u.role = token.role ?? "reader";
      return session;
    },
  },
  pages: { signIn: "/login" },
});
