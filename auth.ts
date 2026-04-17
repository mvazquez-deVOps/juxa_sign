import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import { dbUserFindUniqueWithOrg, dbUserIsRevoked } from "@/lib/data/repository";

const DEMO_SYNTHETIC_USER_ID = "demo-gate";
const REVOKE_REFRESH_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await dbUserFindUniqueWithOrg(email);
        if (!user) return null;

        const bcrypt = await import("bcryptjs");
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          isRevoked: Boolean(user.isRevoked),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.isRevoked = Boolean(user.isRevoked);
        token.revCheckedAt = Date.now();
        return token;
      }

      const id = typeof token.id === "string" ? token.id : "";
      if (id && id !== DEMO_SYNTHETIC_USER_ID) {
        const now = Date.now();
        const last = typeof token.revCheckedAt === "number" ? token.revCheckedAt : null;
        const stale = last == null || now - last > REVOKE_REFRESH_MS;
        if (stale) {
          token.isRevoked = await dbUserIsRevoked(id);
          token.revCheckedAt = now;
        }
      } else {
        token.isRevoked = false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string;
        session.user.isRevoked = Boolean(token.isRevoked);
      }
      return session;
    },
  },
});
