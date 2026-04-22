"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import type { SessionUserChip } from "@/components/sidebar-session";
import { Providers } from "@/components/providers";

export function AppLayoutClient({
  children,
  demoLogout,
  sessionUser,
  showAdminNav,
  showSuperAdminNav,
  consumerFolioNav,
  panelReadOnlyNav,
  memoryDataStore,
  memoryDevSubtitle,
}: {
  children: React.ReactNode;
  demoLogout?: boolean;
  sessionUser?: SessionUserChip | null;
  showAdminNav?: boolean;
  showSuperAdminNav?: boolean;
  /** Rol USER: navegación reducida + folios. */
  consumerFolioNav?: boolean;
  /** Rol VIEWER: solo visualización (consulta + planes; sin configuración ni lotes). */
  panelReadOnlyNav?: boolean;
  /** Desde el servidor: JUXA_DATA_STORE no existe en el cliente. */
  memoryDataStore: boolean;
  /** Subtítulo técnico “modo memoria” cuando `JUXA_DATA_STORE=memory`. */
  memoryDevSubtitle?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const bare =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/acceso-revocado" ||
    pathname.startsWith("/acceso-revocado/") ||
    pathname.startsWith("/invitacion/") ||
    pathname === "/registro" ||
    pathname.startsWith("/registro/");
  return (
    <Providers>
      {bare ? (
        <div className={cn("min-h-screen bg-background text-foreground transition-colors")}>{children}</div>
      ) : (
        <AppShell
          pathname={pathname}
          demoLogout={demoLogout}
          sessionUser={sessionUser ?? null}
          showAdminNav={showAdminNav}
          showSuperAdminNav={showSuperAdminNav}
          consumerFolioNav={consumerFolioNav}
          panelReadOnlyNav={panelReadOnlyNav}
          memoryDataStore={memoryDataStore}
          memoryDevSubtitle={memoryDevSubtitle}
        >
          {children}
        </AppShell>
      )}
    </Providers>
  );
}
