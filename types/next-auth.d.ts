import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      organizationId: string;
      /** true si el administrador revocó el acceso al panel (sesión permitida solo en /acceso-revocado). */
      isRevoked: boolean;
    };
  }

  interface User {
    role: UserRole;
    organizationId: string;
    isRevoked: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId: string;
    isRevoked: boolean;
    /** Marca de tiempo (ms) de la última comprobación de isRevoked en base de datos. */
    revCheckedAt?: number;
  }
}
