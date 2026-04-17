import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

/**
 * Configuración mínima para Edge (middleware): sin Prisma, sin adapter, sin `authorize`.
 * El resto vive en `auth.ts` (runtime Node / Route Handler).
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    /**
     * En Edge no se consulta la base: se confía en el JWT ya firmado.
     * La comprobación de revocación con DB ocurre en `auth.ts` al resolver sesión en Node.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.isRevoked = Boolean(user.isRevoked);
        token.revCheckedAt = Date.now();
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
} satisfies NextAuthConfig;
