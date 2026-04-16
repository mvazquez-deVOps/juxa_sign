import { auth } from "@/auth";
import { cookies } from "next/headers";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";
import { DEMO_SESSION_COOKIE, verifyDemoSessionValue } from "@/lib/demo-auth-verify";
import { isMemoryDataStore } from "@/lib/data/mode";
import { getMemoryDefaultOrganizationId } from "@/lib/store/memory-store";

/** Coincide con `user.id` de la sesión sintética en modo demo (layout / sidebar). */
export const DEMO_SYNTHETIC_USER_ID = "demo-gate";

/**
 * Sesión NextAuth o, en modo demo (DEMO_PASSWORD + cookie válida), una sesión sintética
 * con `organizationId` tomado de DEMO_ORGANIZATION_ID para que `gateMutation` funcione.
 */
export async function resolveSession(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.organizationId) {
    return session;
  }
  return resolveDemoSession();
}

async function resolveDemoSession(): Promise<Session | null> {
  if (!process.env.DEMO_PASSWORD?.trim()) {
    return null;
  }
  const secret = process.env.DEMO_AUTH_SECRET?.trim();
  const orgId =
    process.env.DEMO_ORGANIZATION_ID?.trim() ||
    (isMemoryDataStore() ? getMemoryDefaultOrganizationId() : "");
  if (!secret || !orgId) {
    return null;
  }
  const jar = await cookies();
  const token = jar.get(DEMO_SESSION_COOKIE)?.value;
  if (!token || !(await verifyDemoSessionValue(token, secret))) {
    return null;
  }

  const role: UserRole = "ADMIN";
  return {
    user: {
      id: DEMO_SYNTHETIC_USER_ID,
      email: "demo@panel.local",
      name: "Demo",
      role,
      organizationId: orgId,
      isRevoked: false,
    },
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } as Session;
}
